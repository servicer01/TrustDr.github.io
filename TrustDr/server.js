const express = require('express');
const path    = require('path');
const { Pool } = require('pg');
const { getStripeClient } = require('./stripeClient');
const { sendDocumentEmail } = require('./email');

const app  = express();
const PORT = 5000;

const GEMINI_DEFAULT = 'gemini-2.5-flash';
const GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const ALLOWED_MODELS  = new Set(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']);

/* ─── DB pool ─────────────────────────────────────────────────────────── */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/* ─── Stripe webhook MUST come before express.json() ─────────────────── */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  try {
    const { WebhookHandlers } = require('./webhookHandlers');
    const sig = Array.isArray(signature) ? signature[0] : signature;
    await WebhookHandlers.processWebhook(req.body, sig, handleCheckoutComplete);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: 'Webhook processing error' });
  }
});

app.use(express.json({ limit: '10mb' }));

/* ─── Google AI proxy ─────────────────────────────────────────────────── */
app.post('/api/messages', async (req, res) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_AI_API_KEY not configured' });

  try {
    const messages = (req.body.messages || []).map(msg => {
      if (typeof msg.content === 'string') return { role: msg.role, content: msg.content };
      const text = (msg.content || []).filter(p => p.type === 'text').map(p => p.text).join('\n');
      return { role: msg.role, content: text || '(no text content)' };
    });

    const requestedModel = req.body.model;
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : GEMINI_DEFAULT;

    const response = await fetch(GOOGLE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: req.body.max_tokens || 1000, messages })
    });

    const data = await response.json();
    if (!response.ok) { console.error('Google AI error:', JSON.stringify(data)); return res.status(response.status).json(data); }

    const text = data.choices?.[0]?.message?.content || '';
    res.json({
      id: data.id || 'msg_google', type: 'message', role: 'assistant',
      content: [{ type: 'text', text }], model,
      stop_reason: 'end_turn',
      usage: { input_tokens: data.usage?.prompt_tokens || 0, output_tokens: data.usage?.completion_tokens || 0 }
    });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Failed to reach Google AI API' });
  }
});

/* ─── List models ─────────────────────────────────────────────────────── */
app.get('/api/models', (req, res) => {
  res.json([
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'Fast · Default' },
    { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro',   note: 'Powerful' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', note: 'Legacy fast' },
  ]);
});

/* ─── PDF extraction ─────────────────────────────────────────────────── */
app.post('/api/pdf-extract', async (req, res) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_AI_API_KEY not configured' });
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing base64 PDF data' });
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_DEFAULT}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: 'application/pdf', data } },
            { text: 'Extract and return the full text content of this trust document. Return only the document text, no commentary.' }
          ]}],
          generationConfig: { maxOutputTokens: 8192 }
        })
      }
    );
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Gemini API error', detail: result });
    res.json({ text: result.candidates?.[0]?.content?.parts?.[0]?.text || '' });
  } catch (err) {
    console.error('PDF extract error:', err);
    res.status(500).json({ error: 'Failed to extract PDF text' });
  }
});

/* ─── Paywall: check session access ──────────────────────────────────── */
app.get('/api/access/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.json({ paid: false });
  try {
    const result = await pool.query(
      'SELECT id FROM td_purchases WHERE session_id = $1 LIMIT 1',
      [sessionId]
    );
    res.json({ paid: result.rows.length > 0 });
  } catch (err) {
    console.error('Access check error:', err);
    res.json({ paid: false });
  }
});

/* ─── Paywall: create Stripe Checkout session ────────────────────────── */
app.post('/api/checkout', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const { doc, trustName } = req.body;

  try {
    /* Save doc content so we can email it after payment */
    if (doc) {
      await pool.query(
        `INSERT INTO td_pending_docs (session_id, doc_content, trust_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id) DO UPDATE SET doc_content = $2, trust_name = $3`,
        [sessionId, doc, trustName || null]
      );
    }

    const stripe = getStripeClient();
    const host   = `${req.protocol}://${req.get('host')}`;

    const prices = await stripe.prices.list({ active: true, limit: 10 });
    const price  = prices.data.find(p => p.metadata?.td_product === 'full_download');
    if (!price) return res.status(500).json({ error: 'Product not set up yet. Run: node scripts/seed-products.js' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      mode: 'payment',
      success_url: `${host}/?td_session=${encodeURIComponent(sessionId)}&paid=1`,
      cancel_url:  `${host}/?td_session=${encodeURIComponent(sessionId)}&paid=0`,
      metadata: { td_session_id: sessionId },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── Stripe webhook: record completed payments ──────────────────────── */
async function handleCheckoutComplete(session) {
  const tdSessionId = session.metadata?.td_session_id;
  if (!tdSessionId) return;

  /* Record the purchase */
  try {
    await pool.query(
      `INSERT INTO td_purchases (id, session_id, stripe_payment_intent, stripe_session_id, amount_cents, currency, customer_email, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (session_id) DO NOTHING`,
      [
        `tdp_${Date.now()}`,
        tdSessionId,
        session.payment_intent,
        session.id,
        session.amount_total,
        session.currency,
        session.customer_details?.email || session.customer_email || null
      ]
    );
    console.log('Payment recorded for session:', tdSessionId);
  } catch (err) {
    console.error('Failed to record payment:', err);
  }

  /* Send document email if we have a customer email and doc content */
  const customerEmail = session.customer_details?.email || session.customer_email;
  if (!customerEmail) return;

  try {
    const docRow = await pool.query(
      'SELECT doc_content, trust_name FROM td_pending_docs WHERE session_id = $1',
      [tdSessionId]
    );
    if (!docRow.rows.length || !docRow.rows[0].doc_content) {
      console.warn('No pending doc found for session:', tdSessionId);
      return;
    }
    const { doc_content, trust_name } = docRow.rows[0];
    await sendDocumentEmail({ toEmail: customerEmail, trustName: trust_name, docContent: doc_content });
    console.log('Document email sent to:', customerEmail);

    /* Clean up pending doc */
    await pool.query('DELETE FROM td_pending_docs WHERE session_id = $1', [tdSessionId]);
  } catch (err) {
    console.error('Failed to send document email:', err.message);
  }
}

/* ─── Stripe startup init ─────────────────────────────────────────────── */
async function initStripe() {
  try {
    const stripe = getStripeClient();
    await stripe.prices.list({ limit: 1 });
    const webhookNote = process.env.STRIPE_WEBHOOK_SECRET
      ? 'webhook secret configured'
      : 'no webhook secret yet — payments confirmed via redirect';
    console.log(`Stripe initialized (${webhookNote})`);
  } catch (err) {
    console.warn('Stripe init skipped:', err.message);
  }
}

/* ─── Admin dashboard ─────────────────────────────────────────────────── */
function adminAuth(req, res, next) {
  const password = process.env.ADMIN_PASSWORD || 'TrustDoc2025!';
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString();
    const [, pass] = decoded.split(':');
    if (pass === password) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Trust Doctor Admin"');
  res.status(401).send('Unauthorized');
}

app.get('/admin', adminAuth, async (req, res) => {
  try {
    const [purchasesResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT id, customer_email, stripe_payment_intent, amount_cents, currency, paid_at
         FROM td_purchases ORDER BY paid_at DESC LIMIT 200`
      ),
      pool.query(
        `SELECT COUNT(*) AS total_count,
                COALESCE(SUM(amount_cents), 0) AS total_cents,
                COUNT(CASE WHEN paid_at > NOW() - INTERVAL '30 days' THEN 1 END) AS month_count,
                COALESCE(SUM(CASE WHEN paid_at > NOW() - INTERVAL '30 days' THEN amount_cents END), 0) AS month_cents
         FROM td_purchases`
      )
    ]);

    const { total_count, total_cents, month_count, month_cents } = statsResult.rows[0];
    const fmt = cents => `$${(parseInt(cents) / 100).toFixed(2)}`;

    const rows = purchasesResult.rows.map(r => `
      <tr>
        <td>${new Date(r.paid_at).toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' })}</td>
        <td>${r.customer_email || '<span class="na">—</span>'}</td>
        <td>${fmt(r.amount_cents)} <span class="cur">${(r.currency || 'usd').toUpperCase()}</span></td>
        <td><code>${r.stripe_payment_intent || '—'}</code></td>
      </tr>`).join('');

    res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trust Doctor — Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,sans-serif;background:#f5f5f2;color:#1a1a1a;font-size:14px}
  header{background:#1a1a1a;color:white;padding:16px 28px;display:flex;align-items:center;gap:12px}
  header h1{font-size:16px;font-weight:600}header span{font-size:12px;color:#888;margin-left:auto}
  .wrap{max-width:1100px;margin:0 auto;padding:28px 20px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:28px}
  .stat{background:white;border-radius:10px;padding:18px 20px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
  .stat-n{font-size:26px;font-weight:700;color:#2d6a4f}
  .stat-l{font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
  .card{background:white;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden}
  .card-head{padding:14px 20px;border-bottom:1px solid #f0f0ec;font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center}
  .badge{background:#f0f0ec;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:500;color:#666}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#999;border-bottom:1px solid #f0f0ec;background:#fafaf8}
  td{padding:11px 16px;border-bottom:1px solid #f5f5f2;vertical-align:middle}
  tr:last-child td{border:none}
  tr:hover td{background:#fafaf8}
  code{font-size:11px;background:#f0f0ec;padding:2px 6px;border-radius:4px;color:#555}
  .cur{font-size:11px;color:#999}
  .na{color:#ccc}
  .empty{text-align:center;padding:40px;color:#aaa;font-size:13px}
  .csv-btn{background:#2d6a4f;color:white;border:none;border-radius:7px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
  .csv-btn:hover{background:#1e4d39}
</style>
</head><body>
<header>
  <h1>Trust Doctor — Admin</h1>
  <a class="csv-btn" href="/admin/export.csv" download>⬇ Export CSV</a>
  <span>Purchases dashboard</span>
</header>
<div class="wrap">
  <div class="stats">
    <div class="stat"><div class="stat-n">${total_count}</div><div class="stat-l">Total purchases</div></div>
    <div class="stat"><div class="stat-n">${fmt(total_cents)}</div><div class="stat-l">Total revenue</div></div>
    <div class="stat"><div class="stat-n">${month_count}</div><div class="stat-l">Purchases (30 days)</div></div>
    <div class="stat"><div class="stat-n">${fmt(month_cents)}</div><div class="stat-l">Revenue (30 days)</div></div>
  </div>
  <div class="card">
    <div class="card-head">
      Recent purchases
      <span style="display:flex;align-items:center;gap:10px">
        <a class="csv-btn" href="/admin/export.csv" download>⬇ Export CSV</a>
        <span class="badge">${total_count} total</span>
      </span>
    </div>
    <table>
      <thead><tr>
        <th>Date</th><th>Customer email</th><th>Amount</th><th>Payment intent</th>
      </tr></thead>
      <tbody>
        ${rows || '<tr><td colspan="4" class="empty">No purchases yet.</td></tr>'}
      </tbody>
    </table>
  </div>
</div>
</body></html>`);
  } catch (err) {
    console.error('Admin error:', err);
    res.status(500).send('Database error: ' + err.message);
  }
});

/* ─── Admin CSV export ────────────────────────────────────────────────── */
app.get('/admin/export.csv', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT paid_at, customer_email, amount_cents, currency,
              stripe_payment_intent, stripe_session_id, session_id
       FROM td_purchases ORDER BY paid_at DESC`
    );
    const header = 'Date,Customer Email,Amount (USD),Currency,Payment Intent,Stripe Session,App Session\n';
    const csvRows = result.rows.map(r => {
      const date   = new Date(r.paid_at).toISOString();
      const amount = (r.amount_cents / 100).toFixed(2);
      const escape = v => `"${(v || '').toString().replace(/"/g, '""')}"`;
      return [date, escape(r.customer_email), amount, r.currency || 'usd',
              escape(r.stripe_payment_intent), escape(r.stripe_session_id), escape(r.session_id)].join(',');
    }).join('\n');

    const filename = `trust-doctor-purchases-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(header + csvRows);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).send('Export failed: ' + err.message);
  }
});

/* ─── Static files ────────────────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'trust-doctor')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'trust-doctor', 'index.html')));

/* ─── Start ───────────────────────────────────────────────────────────── */
initStripe().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Trust Doctor running on port ${PORT}`));
});
