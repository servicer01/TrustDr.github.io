/* js/app.js — main controller: state, render loop, event binding */

/* ─── Application State ──────────────────────────────────────────────── */
const S = {
  step: 0,
  g: { name:'', addr:'', city:'', state:'', zip:'', tname:'', ev:'', dob:'' },
  needs: [],
  custom: '',
  parties: [],
  assets: '',
  stateLaw: null,
  slLoad: false,
  rec: null,
  scores: null,
  warns: [],
  recLoading: false,
  tab: 'score',
  docFile: null,
  docAnalysis: null,
  docLoading: false,
  dtab: 'gaps',
  generatedDoc: null,
  docGenLoading: false,
  atty: null,
  attyLoad: false,
  similarProfiles: [],
};

/* ─── Render loop ─────────────────────────────────────────────────────── */
function render() {
  renderProgress(S.step);

  const b = document.getElementById('body');
  if (!b) return;

  if      (S.step === 0) b.innerHTML = renderStep0(S);
  else if (S.step === 1) b.innerHTML = renderStep1(S);
  else if (S.step === 2) b.innerHTML = renderStep2(S);
  else if (S.step === 3) b.innerHTML = renderStep3(S);
  else if (S.step === 4) b.innerHTML = renderStep4(S);
  else if (S.step === 5) { b.innerHTML = renderStep5(); setTimeout(() => loadIntelDashboard(S), 100); }

  bindEvents();

  /* Show/hide the intel banner */
  const banner = document.getElementById('intel-banner');
  if (banner) {
    if (S.similarProfiles?.length && S.step >= 1) {
      banner.style.display = 'block';
      banner.innerHTML = `<strong>Collective insight active</strong> — ${S.similarProfiles.length} similar profile${S.similarProfiles.length > 1 ? 's' : ''} found in the dataset. Their patterns are being used to strengthen your analysis.`;
    } else {
      banner.style.display = 'none';
    }
  }
}

/* ─── Event binding (called after every render) ───────────────────────── */
function bindEvents() {
  const $ = id => document.getElementById(id);

  /* Global */
  $('sv')?.addEventListener('click', () => saveSession(S));
  $('ld')?.addEventListener('click', () => loadSession(S, render));
  $('view-intel')?.addEventListener('click', () => { S.step = 5; render(); });

  /* Step 0 */
  if (S.step === 0) {
    let stTimer = null;
    $('fs')?.addEventListener('input', e => {
      const v = e.target.value.toUpperCase().trim();
      if (v.length === 2 && SA[v]) {
        clearTimeout(stTimer);
        stTimer = setTimeout(() => doFetchState(v), 700);
      }
    });

    $('n0')?.addEventListener('click', async () => {
      S.g = {
        name:  $('fn')?.value.trim()  || '',
        addr:  $('fa')?.value.trim()  || '',
        city:  $('fc')?.value.trim()  || '',
        state: $('fs')?.value.trim().toUpperCase() || '',
        zip:   $('fz')?.value.trim()  || '',
        tname: $('ft')?.value.trim()  || '',
        ev:    $('fev')?.value.trim() || '',
        dob:   $('fd')?.value         || ''
      };
      S.assets = $('fas')?.value.trim() || '';

      /* Load similar profiles before moving to Step 1 */
      S.similarProfiles = await loadSimilarProfiles(S);
      await recordProfile(S, 'intake');

      S.step = 1;
      render();
    });
  }

  /* Step 1 */
  if (S.step === 1) {
    $('b1')?.addEventListener('click', () => { S.step = 0; render(); });

    document.querySelectorAll('.nc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.n;
        if (S.needs.includes(id)) S.needs = S.needs.filter(x => x !== id);
        else S.needs.push(id);
        render();
      });
    });

    $('n1')?.addEventListener('click', () => {
      S.custom = $('fc2')?.value || '';
      S.step = 2;
      render();
    });
  }

  /* Step 2 */
  if (S.step === 2) {
    $('b2')?.addEventListener('click', () => { S.step = 1; render(); });

    $('apb')?.addEventListener('click', () => {
      const n = $('nn')?.value.trim();
      const r = $('nr')?.value;
      if (n) { S.parties.push({ n, r }); $('nn').value = ''; render(); }
    });

    document.querySelectorAll('.rmv').forEach(btn => {
      btn.addEventListener('click', () => {
        S.parties.splice(parseInt(btn.dataset.i), 1);
        render();
      });
    });

    $('n2')?.addEventListener('click', async () => {
      S.step = 3;
      S.recLoading = true;
      S.rec = null; S.scores = null; S.warns = [];
      render();
      await doRunRecommendation();
    });
  }

  /* Step 3 */
  if (S.step === 3) {
    $('b3')?.addEventListener('click', () => { S.step = 2; render(); });
    $('go-rev')?.addEventListener('click', () => { S.step = 4; render(); });

    $('am')?.addEventListener('click', () => {
      const sn = SA[S.g.state] || S.g.state;
      if (typeof sendPrompt === 'function') {
        sendPrompt(`Trust Doctor follow-up: ${S.g.name || 'client'} in ${sn}, goals: ${S.needs.join(', ')}. Questions about the Rockefeller framework.`);
      }
    });

    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => { S.tab = btn.dataset.t; render(); });
    });

    $('gen-doc')?.addEventListener('click', () => doGenerateDoc());
    $('regen-doc')?.addEventListener('click', () => { S.generatedDoc = null; render(); setTimeout(() => doGenerateDoc(), 100); });
    $('dl-doc')?.addEventListener('click', () => downloadTrustDocument(S));
    $('cp-doc')?.addEventListener('click', () => {
      if (S.generatedDoc) navigator.clipboard.writeText(S.generatedDoc).then(() => showToast('Copied')).catch(() => showToast('Copy failed'));
    });

    $('fatty')?.addEventListener('click', () => doFetchAttorneys());
    $('pdf-btn')?.addEventListener('click', () => downloadFullReport(S));
    $('sv2')?.addEventListener('click', () => saveSession(S));
    $('cp-rec')?.addEventListener('click', () => {
      if (S.rec) navigator.clipboard.writeText(S.rec).then(() => showToast('Copied')).catch(() => showToast('Copy failed'));
    });
  }

  /* Step 4 */
  if (S.step === 4) {
    $('b4')?.addEventListener('click', () => { S.step = 3; render(); });

    const dz = $('dz'), fi = $('fi');
    dz?.addEventListener('click', () => fi?.click());
    fi?.addEventListener('change', e => {
      if (e.target.files[0]) { S.docFile = e.target.files[0]; S.docAnalysis = null; render(); }
    });
    dz?.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag'); });
    dz?.addEventListener('dragleave', ()  => dz.classList.remove('drag'));
    dz?.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag');
      if (e.dataTransfer.files[0]) { S.docFile = e.dataTransfer.files[0]; S.docAnalysis = null; render(); }
    });
    $('clf')?.addEventListener('click', () => { S.docFile = null; S.docAnalysis = null; render(); });
    $('run-rev')?.addEventListener('click', () => doDocReview());

    document.querySelectorAll('[data-dt]').forEach(btn => {
      btn.addEventListener('click', () => { S.dtab = btn.dataset.dt; render(); });
    });

    $('ask-doc')?.addEventListener('click', () => {
      if (typeof sendPrompt === 'function') {
        sendPrompt(`Trust Doctor document audit: ${S.docAnalysis?.gaps?.length || 0} gaps found. I have questions about the findings.`);
      }
    });
  }

  /* Step 5 */
  if (S.step === 5) {
    $('b-intel')?.addEventListener('click', () => { S.step = S.rec ? 3 : 0; render(); });
  }
}

/* ─── Async action handlers ───────────────────────────────────────────── */

async function doFetchState(code) {
  S.slLoad = true; S.stateLaw = null; render();
  try   { S.stateLaw = await fetchStateLaw(code); }
  catch { S.stateLaw = `State law data unavailable for ${SA[code] || code}. Consult a local estate attorney.`; }
  S.slLoad = false; render();
}

async function doFetchAttorneys() {
  S.attyLoad = true; render();
  const sn = SA[S.g.state?.toUpperCase()] || S.g.state || 'your state';
  try   { S.atty = (await fetchAttorneyInfo(sn)).replace(/\n/g, '<br>'); }
  catch { S.atty = 'Unable to load. Visit <a href="https://www.actec.org/fellows/find-a-fellow/" target="_blank">actec.org</a> to find a Fellow in your area.'; }
  S.attyLoad = false; render();
}

async function doRunRecommendation() {
  try {
    const { rec, scores, warns } = await runRecommendation(S);
    S.rec = rec; S.scores = scores; S.warns = warns;
    await recordProfile(S, 'rec_complete', {
      rec_scores: scores,
      has_similar_profiles: S.similarProfiles?.length > 0,
      similar_profile_count: S.similarProfiles?.length || 0
    });
  } catch (e) {
    S.rec = 'Error generating analysis. Please check your connection and try again.';
    S.scores = null; S.warns = [];
  }
  S.recLoading = false; render();
}

async function doGenerateDoc() {
  S.docGenLoading = true; S.generatedDoc = null; S.tab = 'doc'; render();
  try   { S.generatedDoc = await generateTrustDocument(S); await recordProfile(S, 'doc_generated'); }
  catch { S.generatedDoc = 'Error generating document. Please try again.'; }
  S.docGenLoading = false; render();
}

async function doDocReview() {
  if (!S.docFile) return;
  S.docLoading = true; S.docAnalysis = null; render();
  try {
    const ext  = S.docFile.name.split('.').pop().toLowerCase();
    let text   = '';
    if (ext === 'pdf') {
      text = await extractPdfText(S.docFile);
    } else {
      text = await S.docFile.text();
    }
    S.docAnalysis = await auditDocument(text, S);
    await recordDocAudit(S, S.docAnalysis);
  } catch (e) {
    S.docAnalysis = {
      scores: { dynasty_s:0, gov:0, gst:0, ins:0, char:0, const:0, insight: 'Error reading document.' },
      gaps:   [{ sev: 'critical', title: 'Document could not be read', body: 'Try a plain text (.txt) version of your trust document for best results.' }],
      strengths:    [],
      improvements: []
    };
  }
  S.docLoading = false; render();
}

/* ─── Boot ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => render());
