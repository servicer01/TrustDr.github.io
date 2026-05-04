/* js/data-engine.js
   Anonymized structural data collection + similarity matching.
   WHAT IS STORED:   trust type, goals, family complexity, estate bracket,
                     state code, party count, pillar scores, gap categories.
   WHAT IS NEVER STORED: names, addresses, document text, asset descriptions,
                          or any personally identifying information.
   Data is shared (shared=true) across all users to improve collective
   recommendations via few-shot context injection into AI prompts.
*/

/* ─── Record a profile event ─────────────────────────────────────────── */
async function recordProfile(S, phase, extra = {}) {
  try {
    const record = {
      id:                uid(),
      ts:                Date.now(),
      phase,
      state:             S.g.state || '',
      estate_bracket:    estateBracket(S.g.ev),
      family_complexity: familyComplexity(S.parties),
      party_count:       S.parties.length,
      goals:             S.needs,
      goal_count:        S.needs.length,
      has_dynasty_goal:  S.needs.includes('dynasty'),
      has_charitable:    S.needs.includes('phil'),
      has_special_needs: S.needs.includes('sn'),
      has_business:      S.needs.includes('biz'),
      has_spendthrift:   S.needs.includes('sp'),
      has_minor:         S.needs.includes('minor'),
      custom_length:     (S.custom || '').length,
      ...extra
    };
    await TDStorage.set(`td_profile:${record.id}`, JSON.stringify(record), true);
  } catch (e) { /* silent — data collection must never break the main app */ }
}

/* ─── Record a document audit event ─────────────────────────────────── */
async function recordDocAudit(S, analysis) {
  if (!analysis) return;
  try {
    const gaps        = analysis.gaps        || [];
    const strengths   = analysis.strengths   || [];
    const improvements = analysis.improvements || [];
    const gapCats     = gaps.map(g =>
      (g.title || '').toLowerCase().replace(/\s+/g, '_').slice(0, 50)
    );
    const strCats     = strengths.map(s =>
      (s.title || '').toLowerCase().replace(/\s+/g, '_').slice(0, 50)
    );
    const sc          = analysis.scores || {};
    const pillarTotal = PILLARS.map(p => sc[p.id] || 0).reduce((a, v) => a + v, 0);
    const record = {
      id:                   uid(),
      ts:                   Date.now(),
      phase:                'doc_audit',
      state:                S.g.state || '',
      estate_bracket:       estateBracket(S.g.ev),
      family_complexity:    familyComplexity(S.parties),
      goals:                S.needs,
      doc_pillar_scores:    sc,
      gap_count:            gaps.length,
      critical_gap_count:   gaps.filter(g => g.sev === 'critical').length,
      moderate_gap_count:   gaps.filter(g => g.sev === 'moderate').length,
      minor_gap_count:      gaps.filter(g => g.sev === 'minor').length,
      gap_categories:       gapCats,
      strength_categories:  strCats,
      improvement_count:    improvements.length,
      overall_doc_score:    Math.round((pillarTotal / (PILLARS.length * 10)) * 100)
    };
    await TDStorage.set(`td_docaudit:${record.id}`, JSON.stringify(record), true);
  } catch (e) {}
}

/* ─── Load similar profiles from shared dataset ──────────────────────── */
async function loadSimilarProfiles(S) {
  try {
    const keys = await TDStorage.list('td_profile:', true);
    if (!keys?.keys?.length) return [];

    const profiles = [];
    /* Read last 80 records at most to stay performant */
    for (const k of keys.keys.slice(-80)) {
      try {
        const r = await TDStorage.get(k, true);
        if (r?.value) profiles.push(JSON.parse(r.value));
      } catch {}
    }

    const myState  = S.g.state;
    const myBrkt   = estateBracket(S.g.ev);
    const myFC     = familyComplexity(S.parties);
    const myGoals  = new Set(S.needs);

    return profiles
      .filter(p => p.phase === 'rec_complete')
      .map(p => {
        let score = 0;
        if (p.state          === myState) score += 3;
        if (p.estate_bracket === myBrkt)  score += 2;
        if (p.family_complexity === myFC) score += 2;
        score += [...myGoals].filter(g => p.goals?.includes(g)).length;
        return { ...p, _sim: score };
      })
      .filter(p => p._sim >= 3)
      .sort((a, b) => b._sim - a._sim)
      .slice(0, 5);
  } catch { return []; }
}

/* ─── Build collective intelligence context string ───────────────────── */
function buildIntelContext(similar) {
  if (!similar?.length) return '';
  const lines = [];

  /* Most common critical gap categories across similar cases */
  const allGaps = similar.flatMap(p => p.gap_categories || []);
  const gf = {};
  allGaps.forEach(g => { gf[g] = (gf[g] || 0) + 1; });
  const topGaps = Object.entries(gf)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k.replace(/_/g, ' '));
  if (topGaps.length) lines.push(`Common critical gaps in similar profiles: ${topGaps.join(', ')}`);

  /* Average document score */
  const withScore = similar.filter(p => p.overall_doc_score);
  if (withScore.length) {
    const avg = Math.round(withScore.reduce((a, p) => a + p.overall_doc_score, 0) / withScore.length);
    lines.push(`Average existing document score for similar profiles: ${avg}%`);
  }

  /* Pattern flags */
  const dynastyRate = similar.filter(p => p.has_dynasty_goal).length / similar.length;
  if (dynastyRate > 0.6) lines.push('Majority of similar profiles prioritized dynasty/multigenerational planning');
  if (similar.some(p => p.has_charitable))    lines.push('Charitable integration is common in similar profiles');
  if (similar.some(p => p.has_special_needs)) lines.push('Special needs trust provisions present in similar cases');
  if (similar.some(p => p.has_business))      lines.push('Business succession clauses frequently needed for similar profiles');

  if (!lines.length) return '';
  return `\nCOLLECTIVE INTELLIGENCE (${similar.length} similar profile${similar.length > 1 ? 's' : ''} from dataset):\n` +
    lines.map(l => `- ${l}`).join('\n') + '\n';
}

/* ─── Build intel summary for UI display ─────────────────────────────── */
function buildIntelSummary(similar) {
  if (!similar?.length) return '';
  const allGoals = similar.flatMap(p => p.goals || []);
  const freq = {};
  allGoals.forEach(g => { freq[g] = (freq[g] || 0) + 1; });
  const top = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => NEEDS.find(n => n.id === k)?.l || k);
  const fc = similar.map(p => p.family_complexity).filter(Boolean);
  const topFC = fc.length
    ? fc.sort((a, b) => fc.filter(x => x === b).length - fc.filter(x => x === a).length)[0].replace(/_/g, ' ')
    : '';
  return `Most common goals: ${top.join(' & ')}${topFC ? ' · Typical profile: ' + topFC : ''}.`;
}

/* ─── Aggregate dataset stats for the insights dashboard ────────────── */
async function getDatasetStats() {
  try {
    const [pk, dk] = await Promise.all([
      TDStorage.list('td_profile:', true),
      TDStorage.list('td_docaudit:', true)
    ]);

    const profileKeys = pk?.keys || [];
    const docKeys     = dk?.keys || [];

    const profiles = [], docs = [];
    for (const k of profileKeys.slice(-40)) {
      try { const r = await TDStorage.get(k, true); if (r?.value) profiles.push(JSON.parse(r.value)); } catch {}
    }
    for (const k of docKeys.slice(-40)) {
      try { const r = await TDStorage.get(k, true); if (r?.value) docs.push(JSON.parse(r.value)); } catch {}
    }

    const goalCounts = {}, stateCounts = {}, fcCounts = {}, gapCatCounts = {};
    profiles.forEach(p => {
      (p.goals || []).forEach(g => { goalCounts[g]  = (goalCounts[g]  || 0) + 1; });
      if (p.state)             stateCounts[p.state]           = (stateCounts[p.state]           || 0) + 1;
      if (p.family_complexity) fcCounts[p.family_complexity]  = (fcCounts[p.family_complexity]  || 0) + 1;
    });
    docs.forEach(d => {
      (d.gap_categories || []).forEach(c => { gapCatCounts[c] = (gapCatCounts[c] || 0) + 1; });
    });

    const topGoal  = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0];
    const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0];
    const topGap   = Object.entries(gapCatCounts).sort((a, b) => b[1] - a[1])[0];
    const topFC    = Object.entries(fcCounts).sort((a, b) => b[1] - a[1])[0];
    const avgScore = docs.length
      ? Math.round(docs.reduce((a, d) => a + (d.overall_doc_score || 0), 0) / docs.length)
      : 0;

    return {
      total_profiles: profileKeys.length,
      total_audits:   docKeys.length,
      top_goal:       topGoal  ? NEEDS.find(n => n.id === topGoal[0])?.l || topGoal[0]     : '—',
      top_state:      topState ? SA[topState[0]] || topState[0]                             : '—',
      top_gap:        topGap   ? topGap[0].replace(/_/g, ' ')                               : '—',
      top_fc:         topFC    ? topFC[0].replace(/_/g, ' ')                                : '—',
      avg_doc_score:  avgScore,
      goal_counts:    goalCounts,
      fc_counts:      fcCounts
    };
  } catch { return null; }
}
