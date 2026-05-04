/* js/intel-dashboard.js — Step 5: collective intelligence dashboard */

function renderStep5() {
  return `<div class="card">
    <div class="ch">
      <h2>Collective intelligence dashboard</h2>
      <p>Anonymized structural patterns from all sessions in the shared dataset.
         No personal data is stored — only trust type, goals, family structure,
         pillar scores, and gap categories.</p>
    </div>
    <div id="intel-content">
      <div style="padding:1rem 0;text-align:center">
        <div class="ldots" style="justify-content:center">
          <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
        <p style="font-size:12px;color:#888;margin-top:8px">Loading dataset patterns…</p>
      </div>
    </div>
    <div class="acts">
      <button class="btn" id="b-intel">← Back</button>
    </div>
  </div>`;
}

async function loadIntelDashboard(S) {
  const ic = document.getElementById('intel-content');
  if (!ic) return;

  const stats = await getDatasetStats();

  if (!stats || stats.total_profiles === 0) {
    ic.innerHTML = `<p style="font-size:12px;color:#888;padding:.5rem 0">
      No collective data yet. Complete a few sessions to start building the dataset.
    </p>`;
    return;
  }

  const GOAL_LABELS = Object.fromEntries(NEEDS.map(n => [n.id, n.l]));
  const FC_LABELS = {
    single_no_dependents:    'Single, no dependents',
    single_with_beneficiaries: 'Single w/ beneficiaries',
    couple:                  'Couple',
    family_with_minors:      'Family with minors',
    blended:                 'Blended family',
    multigenerational:       'Multigenerational'
  };

  const gc    = stats.goal_counts || {};
  const fcc   = stats.fc_counts   || {};
  const maxG  = Math.max(...Object.values(gc),  1);
  const maxFC = Math.max(...Object.values(fcc), 1);

  const goalRows = Object.entries(gc)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `
      <div class="pb-row">
        <span class="pb-n" style="width:160px">${GOAL_LABELS[k] || k}</span>
        <div class="pb-bg"><div class="pb-f" style="width:${Math.round((v / maxG) * 100)}%"></div></div>
        <span class="pb-v">${v}</span>
      </div>`).join('');

  const fcRows = Object.entries(fcc)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `
      <div class="pb-row">
        <span class="pb-n" style="width:160px">${FC_LABELS[k] || k}</span>
        <div class="pb-bg"><div class="pb-f" style="width:${Math.round((v / maxFC) * 100)}%;background:#378ADD"></div></div>
        <span class="pb-v">${v}</span>
      </div>`).join('');

  ic.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-n">${stats.total_profiles}</div><div class="stat-l">Total profiles</div></div>
      <div class="stat-card"><div class="stat-n">${stats.total_audits}</div><div class="stat-l">Doc audits</div></div>
      <div class="stat-card"><div class="stat-n">${stats.avg_doc_score || '—'}%</div><div class="stat-l">Avg. doc score</div></div>
    </div>

    <div class="sh">Most common goals</div>
    <div class="pb-wrap" style="margin-bottom:.875rem">
      ${goalRows || '<p style="font-size:12px;color:#888">No data yet.</p>'}
    </div>

    <div class="sh">Family complexity distribution</div>
    <div class="pb-wrap" style="margin-bottom:.875rem">
      ${fcRows || '<p style="font-size:12px;color:#888">No data yet.</p>'}
    </div>

    <div class="sh">Key dataset signals</div>
    <div class="rtip">
      <div class="rl">Top patterns</div>
      Most common goal: <strong>${stats.top_goal}</strong><br>
      Most active state: <strong>${stats.top_state}</strong><br>
      Most common document gap: <strong>${stats.top_gap}</strong><br>
      Most common family profile: <strong>${stats.top_fc}</strong>
    </div>

    <div class="sh" style="margin-top:1rem">How this data improves recommendations</div>
    <div class="rtip">
      <div class="rl">Similarity engine</div>
      When a new user reaches Step 3, the system pulls the 5 most similar profiles by scoring:
      state match (+3), estate bracket match (+2), family complexity match (+2), goal overlap
      (+1 each). The top matches are summarized into a collective intelligence block injected
      directly into the AI prompt. Recommendations improve with every completed session.
    </div>

    <p style="font-size:11px;color:#aaa;margin-top:.875rem;line-height:1.6">
      All data is anonymized structural metadata. No names, addresses, document text, or
      personally identifying information is stored at any point. Data is shared across all
      users of this application to improve collective recommendations.
    </p>`;
}
