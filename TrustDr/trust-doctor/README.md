# Trust Doctor — Rockefeller Blueprint Edition

**AI-powered pro se trust framework generator with collective intelligence learning.**

A private document tool that helps individuals draft, analyze, and strengthen trust instruments using the Rockefeller dynasty model as the evaluation standard. Built with the Anthropic API (Claude).

---

## What it does

- **5-step intake wizard** — grantor info → goals → named parties → AI analysis → document review
- **Automatic state law lookup** — pulls trust law for all 50 states the moment you enter a state code
- **Rockefeller blueprint scoring** — evaluates every trust against 6 dynasty model pillars with a visual scorecard
- **Trust framework document generator** — produces a substantive pro se working draft with proper legal structure
- **Document review & gap analysis** — upload an existing trust (PDF, Word, or text) for a clause-by-clause audit
- **Collective intelligence engine** — anonymized structural data from past sessions improves future recommendations
- **Session save/load** — persist work across sessions
- **Full report download** — HTML report with blueprint score, recommendations, state law, and document

---

## Legal basis

A trust is a private contract between private parties. It does not require court filing or public recording.  
The right to self-author legal instruments is established under **28 U.S.C. § 1654** and affirmed in ***Faretta v. California*, 422 U.S. 806 (1975)**.  
Professional review by a licensed estate attorney and CPA is strongly encouraged before execution.

---

## Project structure

```
trust-doctor/
├── index.html          # Entry point
├── css/
│   └── main.css        # All styles
├── js/
│   ├── constants.js    # Static data, helper functions
│   ├── storage.js      # Session persistence (localStorage + native storage fallback)
│   ├── data-engine.js  # Anonymized data collection + similarity matching engine
│   ├── api.js          # All Anthropic API calls
│   ├── render.js       # Shared render utilities (progress, score ring, rec text)
│   ├── steps.js        # Step 0–2 HTML renderers
│   ├── tabs.js         # Step 3 tab renderers + offer banner
│   ├── doc-review.js   # Step 4: upload zone, gap analysis, doc score
│   ├── intel-dashboard.js  # Step 5: collective intelligence dashboard
│   ├── pdf.js          # Document + report download generators
│   └── app.js          # Main controller: state, render loop, event binding
└── docs/
    └── DATA_SCHEMA.md  # Full data schema documentation
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/trust-doctor.git
cd trust-doctor
```

### 2. Configure the API endpoint

**Development (direct API — key in browser, not for production):**

Edit `index.html`:
```js
window.TD_CONFIG = {
  API_ENDPOINT: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 1000
};
```
Then add your key to each `fetch` call in `js/api.js` headers:
```js
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_KEY_HERE',
  'anthropic-version': '2023-06-01'
}
```

**Production (recommended — backend proxy):**

Set `API_ENDPOINT` to your own proxy route (e.g. `/api/messages`).  
Your proxy adds the API key server-side. Key never touches the browser.

Example Express proxy:
```js
app.post('/api/messages', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
});
```

### 3. Run locally

No build step required. Open `index.html` directly in a browser, or serve with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## Data privacy

**What is stored (anonymized, shared across users):**
- State code, estate value bracket (7 tiers — never raw value), family complexity category
- Selected goals (IDs only), party count, pillar scores, gap categories (title slugs only)
- Phase flags: intake / rec_complete / doc_generated / doc_audit

**What is NEVER stored:**
- Names, addresses, dates of birth, ZIP codes
- Document text, asset descriptions, family member names
- Any personally identifying information of any kind

All stored data is structural metadata used solely to improve collective recommendations via similarity matching.

---

## Deployment

Works as a static site. Deploy to:
- **GitHub Pages** — push to `gh-pages` branch or enable Pages on `main`
- **Netlify** — drag and drop the folder or connect the repo
- **Vercel** — `vercel --prod` from the project root
- **Cloudflare Pages** — connect repo, build command: none, output: `/`

For production, always use a backend proxy for the API key.

---

## Roadmap

- [ ] Attorney directory integration (state bar API)
- [ ] Multi-trust comparison view
- [ ] Version history for generated documents
- [ ] Email delivery of completed reports
- [ ] Notarization requirement lookup by state
- [ ] Family tree visualization for named parties

---

## Disclaimer

Trust Doctor is an educational tool. It is not a law firm, does not provide legal advice, and does not create an attorney-client relationship. All generated documents are working drafts. Consult a licensed estate planning attorney and CPA before executing any trust instrument.

---

## License

MIT
