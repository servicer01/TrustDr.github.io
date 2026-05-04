/* js/api.js — all Anthropic API calls routed through one function.
   In production, set TD_CONFIG.API_ENDPOINT to your backend proxy
   so the API key never lives in the browser. */

/* ─── Session token tracker ───────────────────────────────────────────── */
window.TD_USAGE = window.TD_USAGE || { input: 0, output: 0, calls: 0 };

function _trackUsage(usage) {
  if (!usage) return;
  window.TD_USAGE.input  += usage.input_tokens  || 0;
  window.TD_USAGE.output += usage.output_tokens || 0;
  window.TD_USAGE.calls  += 1;

  const el = document.getElementById('tok-ctr');
  if (!el) return;

  const total = window.TD_USAGE.input + window.TD_USAGE.output;
  const fmt   = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  el.textContent = fmt(total) + ' tokens';
  el.title = `Session usage\nInput:  ${window.TD_USAGE.input.toLocaleString()} tokens\nOutput: ${window.TD_USAGE.output.toLocaleString()} tokens\nCalls:  ${window.TD_USAGE.calls}`;
  el.classList.add('visible');
  el.className = 'tok-ctr visible' + (total > 50000 ? ' tok-hi' : total > 20000 ? ' tok-mid' : '');
}

async function callAI(prompt, maxTokens = 1000) {
  const cfg = window.TD_CONFIG || {};
  const endpoint = cfg.API_ENDPOINT || 'https://api.anthropic.com/v1/messages';
  const model    = cfg.MODEL        || 'gemini-2.5-flash';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  _trackUsage(data.usage);
  return data.content?.[0]?.text || '';
}

/* ─── State law fetch ─────────────────────────────────────────────────── */
async function fetchStateLaw(code) {
  const sn = SA[code] || code;
  return callAI(
    `Concise trust law briefing for ${sn}: ` +
    `(1) UTC adoption status ` +
    `(2) Dynasty trust perpetuity — maximum duration allowed ` +
    `(3) Estate/inheritance tax rules ` +
    `(4) Asset protection trust availability ` +
    `(5) Is ${sn} favorable for dynasty trusts vs SD/DE/NV/WY? ` +
    `Plain paragraphs, no markdown, under 200 words.`,
    600
  );
}

/* ─── Attorney referral fetch ─────────────────────────────────────────── */
async function fetchAttorneyInfo(stateName) {
  return callAI(
    `Attorney referral guidance for dynasty trust planning in ${stateName}: ` +
    `(1) ${stateName} State Bar referral service name and URL ` +
    `(2) Why ACTEC Fellows are the gold standard (actec.org) ` +
    `(3) Whether to form the trust in ${stateName} or a favorable state like SD/DE/NV/WY ` +
    `(4) Two key questions to ask a prospective attorney about dynasty trust experience. ` +
    `Plain paragraphs, no markdown.`,
    600
  );
}

/* ─── Main recommendation analysis ───────────────────────────────────── */
async function runRecommendation(S) {
  const g   = S.g;
  const sn  = SA[g.state?.toUpperCase()] || g.state || 'Unknown';
  const nl  = S.needs.map(id => NEEDS.find(n => n.id === id)?.l || id).join(', ');
  const ps  = S.parties.map(p => `${p.r}: ${p.n}`).join('; ') || 'None listed';
  const slC = S.stateLaw ? `\nSTATE LAW (${sn}): ${S.stateLaw}` : '';
  const ic  = buildIntelContext(S.similarProfiles);
  const fc  = familyComplexity(S.parties);

  const mainPrompt = `You are a trust design advisor using the Rockefeller dynasty model as primary lens. Educational framework only — not a legal opinion. The user is a pro se grantor exercising rights under 28 U.S.C. § 1654.

GRANTOR: ${g.name || '—'}, ${g.city || ''}, ${sn}
ESTATE: ${g.ev || '—'} | FAMILY PROFILE: ${fc} | ASSETS: ${S.assets || '—'}
GOALS: ${nl}
PARTIES: ${ps}
CIRCUMSTANCES: ${S.custom || 'None'}${slC}${ic}

ROCKEFELLER 6 PILLARS:
1. Dynasty structure — irrevocable/perpetual/GST-exempt
2. Professional governance — institutional trustee, distribution committee
3. GST strategy — IRC §2631, skip generations tax-free
4. Insurance cascade — ILIT + permanent life insurance replenishment
5. Charitable integration — CRT or private foundation alongside family trust
6. Family constitution — HEMS standard, family council, values statement

Provide analysis in this format:
## Recommended trust architecture
### [Trust name] — explain fit through Rockefeller lens, key clauses, pillar served. 2–4 trusts.
## Dual trust strategy
## Key clauses (6–8 specific clauses)
## State jurisdiction (${sn} vs SD/DE/NV/WY)
## IRS and tax strategy (estate tax, GST, IRC §671–679 grantor trust rules)
450 words max. Educational only.`;

  const scorePrompt = `Score this profile against 6 Rockefeller pillars 0–10 each.
Profile: ${sn}, family: ${fc}, goals: ${nl}, estate: ${g.ev || 'unknown'}.
Return ONLY valid JSON (no markdown fences):
{"dynasty_s":N,"gov":N,"gst":N,"ins":N,"char":N,"const":N,"insight":"one sentence summary"}`;

  const warnPrompt = `IRS abusive trust scheme screening. Profile: ${sn}, goals: ${nl}, assets: ${S.assets || '—'}, circumstances: ${S.custom || 'none'}.
Screen for: foreign trust pyramids, business trust chains, equipment trusts, family residence trusts misused for SE tax avoidance, charitable trust shelters.
Return ONLY valid JSON array (no markdown fences): [{"title":"short title","body":"explanation"}] or []`;

  const [mr, sr, wr] = await Promise.all([
    callAI(mainPrompt, 1000),
    callAI(scorePrompt, 400),
    callAI(warnPrompt, 400)
  ]);

  let scores, warns;
  try { scores = JSON.parse(sr.replace(/```json|```/g, '').trim()); }
  catch { scores = { dynasty_s:5, gov:5, gst:5, ins:5, char:5, const:5, insight: '' }; }
  try { warns = JSON.parse(wr.replace(/```json|```/g, '').trim()); }
  catch { warns = []; }

  return { rec: mr, scores, warns };
}

/* ─── Trust framework document generation ─────────────────────────────── */
async function generateTrustDocument(S) {
  const g    = S.g;
  const sn   = SA[g.state?.toUpperCase()] || g.state || 'Unknown';
  const nl   = S.needs.map(id => NEEDS.find(n => n.id === id)?.l || id).join(', ');
  const ps   = S.parties.map(p => `${p.r}: ${p.n}`).join('\n') || 'Not yet specified';
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const fc   = familyComplexity(S.parties);

  const prompt = `Draft a substantive trust framework document for a pro se grantor.
This is a working draft instrument — not a legal opinion. The grantor is exercising
their right to self-author legal instruments under 28 U.S.C. § 1654.

GRANTOR: ${g.name || '[GRANTOR FULL LEGAL NAME]'}
ADDRESS: ${g.addr || ''}, ${g.city || ''}, ${sn} ${g.zip || ''}
TRUST NAME: ${g.tname || '[TRUST NAME]'}
DATE: ${date}
STATE: ${sn}
PARTIES:
${ps}
GOALS: ${nl}
FAMILY PROFILE: ${fc}
ASSETS: ${S.assets || 'To be listed in Schedule A'}
CIRCUMSTANCES: ${S.custom || 'None noted'}
ROCKEFELLER ANALYSIS: ${S.rec ? 'See attached analysis' : 'Standard Rockefeller blueprint'}

Draft a complete trust framework with these sections:
1. TRUST DECLARATION — formal recitals, grantor declaration, trust name, date, governing law (${sn})
2. ARTICLE I — Trust property and Schedule A reference
3. ARTICLE II — Trustee provisions: named trustees, powers, institutional co-trustee recommendation, succession protocol
4. ARTICLE III — Beneficiary provisions: named beneficiaries, HEMS distribution standard (health, education, maintenance, support)
5. ARTICLE IV — Spendthrift protection clause
6. ARTICLE V — Trust powers: investment, asset management, business interests, real property
7. ARTICLE VI — Amendment and revocation (if revocable) OR irrevocability clause (if dynasty/irrevocable goals)
8. ARTICLE VII — Generation-skipping provisions (include only if dynasty goal selected)
9. ARTICLE VIII — Charitable provisions (include only if charitable goal selected)
10. ARTICLE IX — No-contest (in terrorem) clause
11. ARTICLE X — Governing law, severability, and interpretation
12. SIGNATURE BLOCK — execution requirements and notarization guidance for ${sn}
13. SCHEDULE A — Asset schedule (placeholder with instructions)

Use formal trust document language throughout.
Insert [BRACKETED PLACEHOLDERS] where the grantor must supply specific details.
Begin document with this header exactly:
"PRO SE TRUST FRAMEWORK — WORKING DRAFT
Prepared under 28 U.S.C. § 1654. This is a private instrument between private parties.
Professional review by a licensed estate attorney and CPA is strongly encouraged before execution."

Do not include legal opinions or conclusory statements about enforceability.
Write the full document — approximately 900–1100 words.`;

  return callAI(prompt, 1000);
}

/* ─── Document audit against Rockefeller blueprint ───────────────────── */
async function auditDocument(docText, S) {
  const g  = S.g;
  const sn = SA[g.state?.toUpperCase()] || g.state || 'Unknown';
  const nl = S.needs.map(id => NEEDS.find(n => n.id === id)?.l || id).join(', ');
  const ic = buildIntelContext(S.similarProfiles);
  const fc = familyComplexity(S.parties);

  const prompt = `You are auditing a trust document against the Rockefeller dynasty blueprint.
This is educational analysis only — not a legal opinion.

DOCUMENT TEXT:
${docText.slice(0, 8000)}

GRANTOR CONTEXT: ${sn}, estate ~${g.ev || 'unknown'}, goals: ${nl}, family: ${fc}${ic}

AUDIT AGAINST 6 ROCKEFELLER PILLARS:
1. Dynasty structure — irrevocable design, perpetual/long duration, generation-skipping provisions
2. Professional governance — institutional trustee requirement, distribution committee, trustee succession
3. GST tax strategy — GST exemption allocation clause, generation-skipping language, IRC §2631 compliance
4. Insurance cascade — ILIT provisions, life insurance asset authorization, death benefit direction into trust
5. Charitable integration — charitable remainder trust language, foundation references, philanthropic provisions
6. Family constitution — HEMS distribution standard, spendthrift clause, no-contest clause, family council language

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "scores": {"dynasty_s":N,"gov":N,"gst":N,"ins":N,"char":N,"const":N,"insight":"one sentence overall assessment"},
  "gaps": [{"sev":"critical|moderate|minor","title":"gap title","body":"what is missing and why it matters under the Rockefeller model"}],
  "strengths": [{"title":"provision title","body":"what this clause does well"}],
  "improvements": [{"title":"specific addition or amendment","body":"what to add, specific language guidance"}]
}
Identify 3–8 gaps, 2–5 strengths, 3–6 improvements. Reference specific clause language when present in the document.`;

  const raw = await callAI(prompt, 1000);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

/* ─── Extract text from PDF via Google AI Gemini native vision ────────── */
async function extractPdfText(file) {
  const b64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

  const res = await fetch('/api/pdf-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: b64 })
  });
  const result = await res.json();
  return result.text || '';
}
