/* js/paywall.js — full-document download paywall via Stripe Checkout */

/* Deterministic session ID persisted in localStorage */
function getTDSessionId() {
  let id = localStorage.getItem('td_pay_session');
  if (!id) {
    id = 'tds_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('td_pay_session', id);
  }
  return id;
}

/* Check if user has already paid (cached + server verified) */
async function checkPaidAccess() {
  if (localStorage.getItem('td_paid') === '1') return true;
  try {
    const sid = getTDSessionId();
    const res  = await fetch(`/api/access/${encodeURIComponent(sid)}`);
    const data = await res.json();
    if (data.paid) { localStorage.setItem('td_paid', '1'); return true; }
  } catch {}
  return false;
}

/* On page load, check URL params set by Stripe success redirect */
(function handleStripeReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('paid') !== '1') return;

  localStorage.setItem('td_paid', '1');
  localStorage.setItem('td_stripe_return', '1');

  /* Restore session ID from URL if present */
  const urlSession = params.get('td_session');
  if (urlSession) localStorage.setItem('td_pay_session', urlSession);

  /* Clean URL without reloading */
  history.replaceState({}, '', window.location.pathname);
})();

/* Show the post-payment success overlay */
function showPaySuccess() {
  const overlay = document.getElementById('pay-success-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';

  /* Auto-trigger download after brief delay so doc tab has rendered */
  setTimeout(() => {
    const hasPendingDoc = !!localStorage.getItem('td_pending_doc');
    if (hasPendingDoc && typeof S !== 'undefined' && S.generatedDoc) {
      downloadTrustDocument(S);
    }
  }, 800);
}

function closePaySuccess() {
  const overlay = document.getElementById('pay-success-overlay');
  if (overlay) overlay.style.display = 'none';
}

/* Show paywall modal then redirect to Stripe Checkout */
async function initiateCheckout() {
  /* Save generated doc to localStorage so it survives the redirect */
  try {
    if (typeof S !== 'undefined' && S.generatedDoc) {
      localStorage.setItem('td_pending_doc', S.generatedDoc);
    }
  } catch {}

  const modal = document.getElementById('pw-modal');
  if (modal) {
    const btn = modal.querySelector('.pw-cta');
    if (btn) { btn.textContent = 'Redirecting to checkout…'; btn.disabled = true; }
  }

  try {
    const docContent = (typeof S !== 'undefined' && S.generatedDoc) ? S.generatedDoc : null;
    const trustName  = (typeof S !== 'undefined' && S.g?.tname)     ? S.g.tname     : null;
    const res  = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getTDSessionId(), doc: docContent, trustName })
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      if (modal) {
        modal.style.display = 'none';
        const btn = modal.querySelector('.pw-cta');
        if (btn) { btn.textContent = 'Unlock for $19 →'; btn.disabled = false; }
      }
      showToast(data.error || 'Checkout unavailable — try again.');
    }
  } catch (err) {
    if (modal) {
      modal.style.display = 'none';
      const btn = modal.querySelector('.pw-cta');
      if (btn) { btn.textContent = 'Unlock for $19 →'; btn.disabled = false; }
    }
    showToast('Checkout error — check connection.');
  }
}

/* Intercept download buttons — check paid status first */
async function guardedDownload(downloadFn) {
  const paid = await checkPaidAccess();
  if (paid) {
    downloadFn();
  } else {
    showPaywallModal(downloadFn);
  }
}

let _pendingDownload = null;

function showPaywallModal(downloadFn) {
  _pendingDownload = downloadFn;
  const modal = document.getElementById('pw-modal');
  if (modal) modal.style.display = 'flex';
}

/* Called by "Unlock" button in modal */
async function paywallCheckout() {
  await initiateCheckout();
}

/* Called by "Already paid?" link in modal */
async function paywallVerify() {
  const paid = await checkPaidAccess();
  if (paid) {
    document.getElementById('pw-modal').style.display = 'none';
    if (_pendingDownload) { _pendingDownload(); _pendingDownload = null; }
    showToast('Access confirmed — downloading.');
  } else {
    showToast('No payment found for this browser session.');
  }
}

function closePaywallModal() {
  const modal = document.getElementById('pw-modal');
  if (modal) modal.style.display = 'none';
  _pendingDownload = null;
}

/* Preview: show only first ~2 "pages" worth of text (≈1800 chars) */
function previewText(fullText, limit = 1800) {
  if (!fullText || fullText.length <= limit) return { preview: fullText, truncated: false };
  const cut = fullText.lastIndexOf('\n', limit) || limit;
  return { preview: fullText.slice(0, cut), truncated: true };
}
