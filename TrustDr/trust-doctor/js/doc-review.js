/* js/doc-review.js — Step 4: document upload, audit, and results */

function renderStep4(S) {
  const dtabs = [
    { id: 'gaps',   l: 'Gap analysis' },
    { id: 'str',    l: 'Strengths' },
    { id: 'impr',   l: 'Improvements' },
    { id: 'dscore', l: 'Document score' }
  ];

  return `<div class="card">
    <div class="ch">
      <h2>Document review</h2>
      <p>Upload your existing trust document for a full Rockefeller blueprint audit.
         The AI reads your document, scores every section against the 6 pillars,
         identifies missing protections, and shows exactly what to strengthen.</p>
    </div>

    ${!S.docFile ? renderUploadZone() : renderFileReady(S.docFile)}

    ${S.docFile && !S.docAnalysis && !S.docLoading
      ? `<button class="btn pri" id="run-rev" style="width:100%;margin-bottom:.75rem">
           Audit against Rockefeller blueprint ↗
         </button>`
      : ''}

    ${S.docLoading
      ? `<div style="padding:1.25rem 0;text-align:center">
           <div class="ldots" style="justify-content:center">
             <div class="dot"></div><div class="dot"></div><div class="dot"></div>
           </div>
           <p style="font-size:12px;color:#888;margin-top:9px">
             Reading document · Scoring all 6 pillars · Identifying gaps…
           </p>
         </div>`
      : ''}

    ${S.docAnalysis
      ? `<div>
           <div class="tab-bar">
             ${dtabs.map(t => `<button class="tab${S.dtab === t.id ? ' act' : ''}" data-dt="${t.id}">${t.l}</button>`).join('')}
           </div>
           <div class="tc${S.dtab === 'gaps'   ? ' vis' : ''}">${renderDocGaps(S)}</div>
           <div class="tc${S.dtab === 'str'    ? ' vis' : ''}">${renderDocStrengths(S)}</div>
           <div class="tc${S.dtab === 'impr'   ? ' vis' : ''}">${renderDocImprovements(S)}</div>
           <div class="tc${S.dtab === 'dscore' ? ' vis' : ''}">${renderDocScore(S)}</div>
         </div>`
      : ''}

    <div class="acts">
      <button class="btn" id="b4">← Back to framework</button>
      ${S.docAnalysis ? `<button class="btn pri" id="ask-doc">Ask about findings ↗</button>` : ''}
    </div>
  </div>`;
}

function renderUploadZone() {
  return `<div class="uz" id="dz">
    <input type="file" id="fi" accept=".pdf,.doc,.docx,.txt">
    <div style="font-size:28px;margin-bottom:8px">📂</div>
    <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:4px">
      Drop your trust document here
    </p>
    <p style="font-size:12px;color:#888">
      PDF, Word (.docx), or plain text · Click to browse
    </p>
    <p style="font-size:10px;color:#aaa;margin-top:6px">
      Document is read by AI and not retained. Structural patterns only are
      anonymized and saved to improve collective recommendations.
    </p>
  </div>`;
}

function renderFileReady(file) {
  const kb = file ? Math.round(file.size / 1024) + 'KB' : '';
  return `<div class="fready">
    <span style="font-size:18px">📄</span>
    <div>
      <div class="fn">${esc(file?.name || '')}</div>
      <div class="fs">${kb} · Ready for Rockefeller blueprint audit</div>
    </div>
    <button class="fcl" id="clf">✕ Remove</button>
  </div>`;
}

function renderDocScore(S) {
  if (!S.docAnalysis?.scores) return '<p style="font-size:12px;color:#888">Score unavailable.</p>';
  const sc   = S.docAnalysis.scores;
  const tot  = PILLARS.map(p => sc[p.id] || 0).reduce((a, v) => a + v, 0);
  const pct  = Math.round((tot / (PILLARS.length * 10)) * 100);
  const col  = pct >= 80 ? '#1D9E75' : pct >= 60 ? '#EF9F27' : '#E24B4A';
  const gr   = pct >= 80 ? 'Strong' : pct >= 60 ? 'Adequate' : pct >= 40 ? 'Needs work' : 'Significant gaps';
  const crit = (S.docAnalysis.gaps || []).filter(g => g.sev === 'critical').length;

  return `<div class="dsc-row">
    <div class="dsc"><div class="dsc-n" style="color:${col}">${pct}%</div><div class="dsc-l">Rockefeller alignment</div></div>
    <div class="dsc"><div class="dsc-n" style="color:${col}">${gr}</div><div class="dsc-l">Assessment</div></div>
    <div class="dsc"><div class="dsc-n" style="color:#E24B4A">${crit}</div><div class="dsc-l">Critical gaps</div></div>
  </div>
  ${renderPillarBars(sc)}
  ${sc.insight ? `<div class="rtip"><div class="rl">Assessment</div>${esc(sc.insight)}</div>` : ''}`;
}

function renderDocGaps(S) {
  if (!S.docAnalysis?.gaps?.length) {
    return `<p style="font-size:12px;color:#888">No significant gaps detected.</p>`;
  }
  return S.docAnalysis.gaps.map(g => `
    <div class="gi ${g.sev === 'critical' ? 'crit' : g.sev === 'moderate' ? 'mod' : 'min'}">
      <div class="gh">
        <span class="pill ${g.sev === 'critical' ? 'p-red' : g.sev === 'moderate' ? 'p-amber' : 'p-blue'}">${g.sev}</span>
        <span class="gt">${esc(g.title)}</span>
      </div>
      <div class="gb">${esc(g.body)}</div>
    </div>`).join('');
}

function renderDocStrengths(S) {
  if (!S.docAnalysis?.strengths?.length) {
    return `<p style="font-size:12px;color:#888">No strengths identified.</p>`;
  }
  return S.docAnalysis.strengths.map(s => `
    <div class="gi str">
      <div class="gh"><span class="pill p-green">strength</span><span class="gt">${esc(s.title)}</span></div>
      <div class="gb">${esc(s.body)}</div>
    </div>`).join('');
}

function renderDocImprovements(S) {
  if (!S.docAnalysis?.improvements?.length) {
    return `<p style="font-size:12px;color:#888">No improvements generated.</p>`;
  }
  return `<p style="font-size:12px;color:#666;margin-bottom:.75rem;line-height:1.6">
    Specific additions that would bring this document closer to Rockefeller blueprint
    standard. Bring these to your estate attorney for drafting.
  </p>` + S.docAnalysis.improvements.map((im, i) => `
    <div class="gi">
      <div class="gh"><span class="pill p-blue">${i + 1}</span><span class="gt">${esc(im.title)}</span></div>
      <div class="gb">${esc(im.body)}</div>
    </div>`).join('');
}
