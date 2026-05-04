/* js/tabs.js — tab content renderers for Step 3 (Framework screen) */

function renderTabScore(S)   { return renderScoreRing(S.scores, S.similarProfiles); }
function renderTabRecs(S)    { return renderRecText(S.rec); }

function renderTabDoc(S) {
  if (S.docGenLoading) {
    return `<div style="padding:1.25rem 0;text-align:center">
      <div class="ldots" style="justify-content:center">
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>
      <p style="font-size:12px;color:#888;margin-top:9px">Drafting your trust framework document…</p>
    </div>`;
  }
  if (!S.generatedDoc) {
    return `<div style="padding:.5rem 0">
      <p style="font-size:12px;color:#666;line-height:1.6;margin-bottom:.875rem">
        Generate a substantive trust framework document based on your profile and
        Rockefeller blueprint analysis. This is a working pro se instrument you own
        and control — a private document between you and your named parties.
        Professional review by an estate attorney and CPA is strongly encouraged
        before execution and notarization.
      </p>
      <button class="btn pri" id="gen-doc" style="width:100%">Generate my trust framework document ↗</button>
    </div>`;
  }
  const { preview, truncated } = previewText(S.generatedDoc, 1800);
  const previewHtml = truncated
    ? `${esc(preview)}<span class="doc-fade-sentinel"></span>`
    : esc(S.generatedDoc);

  const downloadBtns = truncated
    ? `<div class="pw-teaser">
        <div class="pw-lock">🔒</div>
        <div class="pw-msg">
          <strong>Full document — 2+ more pages</strong><br>
          Unlock the complete trust framework as a downloadable file for a one-time fee.
        </div>
        <button class="btn pri pw-unlock-btn" id="dl-doc">Unlock full download — $19</button>
      </div>
      <button class="btn" id="cp-doc" style="margin-top:6px">Copy preview text</button>
      <button class="btn" id="regen-doc" style="margin-top:4px">Regenerate</button>`
    : `<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:.75rem">
        <button class="btn pri" id="dl-doc">Download document</button>
        <button class="btn" id="cp-doc">Copy text</button>
        <button class="btn" id="regen-doc">Regenerate</button>
      </div>`;

  return `<div>
    <div class="rtip" style="margin-bottom:.875rem">
      <div class="rl">Your private document</div>
      This is your pro se trust framework. It does not require filing with any court or
      government office. Present it to your bank, CPA, or estate attorney as needed.
      Have an attorney review before execution for your state's notarization requirements.
    </div>
    <div class="doc-preview${truncated ? ' doc-preview-clipped' : ''}" id="doc-text">${previewHtml}</div>
    ${downloadBtns}
  </div>`;
}

function renderTabWarns(S) {
  if (!S.warns?.length) {
    return `<p style="font-size:12px;color:#888;padding:.5rem 0">
      No IRS red flags identified for this trust profile.
      The Rockefeller model used only legitimate, fully compliant structures.
    </p>`;
  }
  return S.warns.map(w => `
    <div class="wb-blk">
      <div class="wh">Warning: ${esc(w.title)}</div>
      <div class="wb">${esc(w.body)}</div>
    </div>`).join('');
}

function renderTabAtty(S) {
  const sn = SA[S.g.state?.toUpperCase()] || S.g.state || 'your state';
  if (S.attyLoad) {
    return `<div style="padding:1rem 0">
      <div class="ldots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      <span style="font-size:12px;color:#888;margin-left:8px">Finding attorneys in ${sn}…</span>
    </div>`;
  }
  if (!S.atty) {
    return `<div style="padding:.25rem 0">
      <p style="font-size:12px;color:#666;margin-bottom:.75rem">
        Find a licensed estate planning attorney in ${sn} to review your framework
        before execution. Look for ACTEC Fellows — the highest designation in trust
        and estate law. Professional review is recommended, not required.
      </p>
      <button class="btn pri" id="fatty">Find attorneys in ${sn} ↗</button>
    </div>`;
  }
  return `<div class="atty-body">${S.atty}</div>
    <div class="irs-row" style="margin-top:10px">
      <a href="https://www.actec.org/fellows/find-a-fellow/" target="_blank">ACTEC Fellows</a>
      <a href="https://www.martindale.com/estate-planning-attorneys/" target="_blank">Martindale</a>
      <a href="https://www.avvo.com/estate-planning-lawyer.html" target="_blank">Avvo</a>
      <a href="https://www.americanbar.org/groups/real_property_trust_estate/" target="_blank">ABA Estate</a>
    </div>`;
}

function renderTabExport(S) {
  const g  = S.g;
  const nl = S.needs.map(id => NEEDS.find(n => n.id === id)?.l || id).join(', ');
  return `<div style="padding:.25rem 0">
    <div class="rtip">
      <div class="rl">Session summary</div>
      Grantor: <strong>${esc(g.name) || '—'}</strong> &nbsp;·&nbsp;
      ${SA[g.state] || g.state || '—'} &nbsp;·&nbsp;
      ${esc(g.tname) || 'Unnamed trust'}<br>
      Estate: ${esc(g.ev) || '—'} &nbsp;·&nbsp; Goals: ${nl || 'None'}
    </div>
    <div style="display:flex;flex-direction:column;gap:7px;margin-top:.875rem">
      <button class="btn pri" id="pdf-btn" style="width:fit-content">Download full report</button>
      <button class="btn"     id="sv2"     style="width:fit-content">Save session</button>
      <button class="btn"     id="cp-rec"  style="width:fit-content">Copy analysis text</button>
    </div>
    <p style="font-size:11px;color:#aaa;margin-top:.75rem;line-height:1.6">
      Report includes: grantor profile, state trust law, Rockefeller blueprint score,
      trust recommendations, framework document, IRS compliance review, and
      professional review checklist.
    </p>
  </div>`;
}

/* Step 3 full render */
function renderStep3(S) {
  const tabs = [
    { id: 'score', l: 'Blueprint score' },
    { id: 'recs',  l: 'Recommendations' },
    { id: 'doc',   l: 'Trust framework' },
    { id: 'warns', l: `IRS review${S.warns?.length ? ' (' + S.warns.length + ')' : ''}` },
    { id: 'atty',  l: 'Find attorney' },
    { id: 'exp',   l: 'Export' }
  ];

  if (S.recLoading) {
    return `<div class="card">
      <div class="ch">
        <h2>Generating your framework…</h2>
        <p>Analyzing profile · Pulling ${SA[S.g.state] || 'state'} trust law ·
           Injecting collective intelligence · Running IRS compliance review</p>
      </div>
      <div style="padding:1.5rem 0;text-align:center">
        <div class="ldots" style="justify-content:center">
          <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
      </div>
    </div>
    ${renderDocOfferBanner()}`;
  }

  const simNote = S.similarProfiles?.length
    ? ` · ${S.similarProfiles.length} similar profile${S.similarProfiles.length > 1 ? 's' : ''} used`
    : '';

  return `<div class="card">
    <div class="ch" style="margin-bottom:.75rem">
      <h2>${esc(S.g.tname) || 'Your trust framework'}</h2>
      <p style="font-size:11px">${SA[S.g.state] || ''} · Rockefeller Blueprint · Pro Se${simNote}</p>
    </div>
    <div class="tab-bar">
      ${tabs.map(t => `<button class="tab${S.tab === t.id ? ' act' : ''}" data-t="${t.id}">${t.l}</button>`).join('')}
    </div>
    <div class="tc${S.tab === 'score' ? ' vis' : ''}">${renderTabScore(S)}</div>
    <div class="tc${S.tab === 'recs'  ? ' vis' : ''}">${renderTabRecs(S)}</div>
    <div class="tc${S.tab === 'doc'   ? ' vis' : ''}">${renderTabDoc(S)}</div>
    <div class="tc${S.tab === 'warns' ? ' vis' : ''}">${renderTabWarns(S)}</div>
    <div class="tc${S.tab === 'atty'  ? ' vis' : ''}">${renderTabAtty(S)}</div>
    <div class="tc${S.tab === 'exp'   ? ' vis' : ''}">${renderTabExport(S)}</div>
    <div class="acts">
      <button class="btn" id="b3">← Revise</button>
      <button class="btn pri" id="am">Ask follow-up ↗</button>
    </div>
  </div>
  ${renderDocOfferBanner()}`;
}

function renderDocOfferBanner() {
  return `<div class="ob">
    <div style="font-size:22px;flex-shrink:0">📄</div>
    <div class="ob-t">
      <h3>Have an existing trust document?</h3>
      <p>Upload it for a full Rockefeller blueprint audit — gap analysis,
         pillar scores, and specific improvements.</p>
    </div>
    <button class="ob-btn" id="go-rev">Review document →</button>
  </div>`;
}
