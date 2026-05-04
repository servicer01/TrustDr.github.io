/* js/render.js — shared rendering utilities */

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function renderProgress(step) {
  const el = document.getElementById('prog');
  if (!el) return;
  el.innerHTML = STEPS.map((s, i) => {
    const cls = i < step ? 'ps dn' : i === step ? 'ps act' : 'ps';
    const inner = i < step ? '✓' : (i + 1).toString();
    return `<div class="${cls}">
      <div class="psd">${inner}</div>
      <div class="psl">${s.l}</div>
    </div>`;
  }).join('');
}

/* Render Rockefeller blueprint pillar bar chart */
function renderPillarBars(scores) {
  if (!scores) return '';
  return `<div class="pb-wrap">
    ${PILLARS.map(p => {
      const v  = scores[p.id] || 0;
      const pw = Math.round((v / 10) * 100);
      const c  = pw >= 70 ? '#1D9E75' : pw >= 40 ? '#EF9F27' : '#E24B4A';
      return `<div class="pb-row">
        <span class="pb-n">${p.ic} ${p.l}</span>
        <div class="pb-bg"><div class="pb-f" style="width:${pw}%;background:${c}"></div></div>
        <span class="pb-v">${v}/10</span>
      </div>`;
    }).join('')}
  </div>`;
}

/* Parse and render AI recommendation text into styled blocks */
function renderRecText(text) {
  if (!text) return '<p style="font-size:12px;color:#888">Not generated.</p>';
  const lines = text.split('\n');
  let html = '', inBlock = false;
  for (const ln of lines) {
    if (ln.startsWith('### ')) {
      if (inBlock) html += '</div>';
      const title = ln.replace('### ', '');
      const isI   = /irrevoc|dynasty|ilit|charit/i.test(title);
      const isR   = /revoc|living/i.test(title);
      html += `<div class="tb-blk"><div class="tt">
        ${isI ? '<span class="pill p-red">Irrevocable</span>' : isR ? '<span class="pill p-blue">Revocable</span>' : ''}
        <span class="pill p-rock">Rockefeller-aligned</span>
        <span>${title}</span>
      </div>`;
      inBlock = true;
    } else if (ln.startsWith('## ')) {
      if (inBlock) { html += '</div>'; inBlock = false; }
      html += `<div class="sh">${ln.replace('## ', '')}</div>`;
    } else if (/^[-*] /.test(ln)) {
      html += `<p class="tb">• ${ln.slice(2)}</p>`;
    } else if (ln.trim()) {
      html += `<p class="tb">${ln}</p>`;
    }
  }
  if (inBlock) html += '</div>';

  html += `<div style="margin-top:9px">
    <div style="font-size:11px;color:#888;margin-bottom:4px">IRS reference resources:</div>
    <div class="irs-row">
      <a href="https://www.irs.gov/businesses/small-businesses-self-employed/abusive-trust-tax-evasion-schemes-special-types-of-trusts" target="_blank">Trust compliance</a>
      <a href="https://www.irs.gov/charities-non-profits/charitable-organizations/private-foundations" target="_blank">Private foundations</a>
      <a href="https://www.irs.gov/charities-non-profits/exempt-organization-types" target="_blank">Exempt orgs</a>
      <a href="https://www.irs.gov/charities-non-profits/other-nonprofits" target="_blank">Other nonprofits</a>
      <a href="https://www.irs.gov/pub/irs-pdf/i990pf.pdf" target="_blank">Form 990-PF</a>
    </div>
  </div>`;
  return html;
}

/* Render score ring SVG + summary */
function renderScoreRing(scores, similarProfiles) {
  if (!scores) return '<p style="font-size:12px;color:#888">Score not available.</p>';
  const tot = PILLARS.map(p => scores[p.id] || 0).reduce((a, v) => a + v, 0);
  const pct = Math.round((tot / (PILLARS.length * 10)) * 100);
  const col = pct >= 80 ? '#1D9E75' : pct >= 55 ? '#EF9F27' : '#E24B4A';
  const gr  = pct >= 80 ? 'Strong alignment' : pct >= 55 ? 'Partial alignment' : 'Needs strengthening';
  const c   = 2 * Math.PI * 36;
  const d   = c * (pct / 100);

  const intelBlock = similarProfiles?.length
    ? `<div class="intel-card">
        <div class="ic-head"><span class="pill p-blue">Collective insight · ${similarProfiles.length} similar profile${similarProfiles.length > 1 ? 's' : ''}</span></div>
        <div class="ic-body">${esc(buildIntelContext(similarProfiles)) || 'Pattern data from similar profiles was used to inform this analysis.'}</div>
      </div>`
    : '';

  return `<div class="sring">
    <svg width="82" height="82" viewBox="0 0 82 82" style="flex-shrink:0">
      <circle cx="41" cy="41" r="36" fill="none" stroke="#e0e0dc" stroke-width="6"/>
      <circle cx="41" cy="41" r="36" fill="none" stroke="${col}" stroke-width="6"
        stroke-dasharray="${d.toFixed(1)} ${c.toFixed(1)}"
        stroke-linecap="round" transform="rotate(-90 41 41)"/>
      <text x="41" y="46" text-anchor="middle" font-size="17" font-weight="700" fill="${col}">${pct}%</text>
    </svg>
    <div class="sd">
      <div class="st">Rockefeller blueprint alignment</div>
      <div class="ss">${gr}${scores.insight ? '<br>' + esc(scores.insight) : ''}</div>
    </div>
  </div>
  ${renderPillarBars(scores)}
  ${intelBlock}`;
}
