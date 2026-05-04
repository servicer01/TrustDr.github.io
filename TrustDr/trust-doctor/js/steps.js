/* js/steps.js — HTML renderers for Steps 0, 1, 2 */

function renderStep0(S) {
  const g      = S.g;
  const isDyn  = DYNASTY_STATES.includes(g.state?.toUpperCase());
  const dynTip = isDyn
    ? `<div class="rtip"><div class="rl">Rockefeller tip</div>
        ${SA[g.state]} is a premier dynasty trust jurisdiction — perpetual trusts permitted,
        strong asset protection statutes, no state income tax on trust income in most structures.
       </div>`
    : '';
  const slBox = S.slLoad
    ? `<div class="sl-box" style="display:block">
        <div class="sl-head">Loading ${SA[g.state] || g.state} trust law…</div>
        <div class="ldots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
       </div>`
    : S.stateLaw
      ? `<div class="sl-box" style="display:block">
          <div class="sl-head">${SA[g.state] || g.state} — trust law overview</div>
          ${esc(S.stateLaw)}
         </div>`
      : '';

  return `<div class="card">
    <div class="ch">
      <h2>Grantor information</h2>
      <p>Enter your legal name and address. Your state triggers an automatic trust law lookup —
         the Rockefeller model frequently used favorable jurisdictions like South Dakota or Delaware.</p>
    </div>

    <div class="fld"><label>Full legal name</label>
      <input id="fn" value="${esc(g.name)}" placeholder="Jane A. Smith">
    </div>
    <div class="fld"><label>Street address</label>
      <input id="fa" value="${esc(g.addr)}" placeholder="123 Main Street">
    </div>
    <div class="row3">
      <div class="fld"><label>City</label><input id="fc" value="${esc(g.city)}" placeholder="Kansas City"></div>
      <div class="fld"><label>State</label><input id="fs" value="${esc(g.state)}" placeholder="KS" maxlength="2" style="text-transform:uppercase"></div>
      <div class="fld"><label>ZIP</label><input id="fz" value="${esc(g.zip)}" placeholder="66101"></div>
    </div>

    ${dynTip}
    ${slBox}

    <div class="row">
      <div class="fld"><label>Trust name</label>
        <input id="ft" value="${esc(g.tname)}" placeholder="The Smith Family Trust">
      </div>
      <div class="fld"><label>Approximate estate value</label>
        <input id="fev" value="${esc(g.ev)}" placeholder="e.g. $1.8M">
      </div>
    </div>
    <div class="fld"><label>Date of birth</label>
      <input id="fd" type="date" value="${esc(g.dob || '')}">
    </div>
    <div class="fld"><label>Asset description</label>
      <textarea id="fas" placeholder="Home, investment accounts, business interests, retirement accounts, life insurance, rental property…">${esc(S.assets)}</textarea>
    </div>

    <div class="acts">
      <div></div>
      <button class="btn pri" id="n0">Next: Goals &amp; needs →</button>
    </div>
  </div>`;
}

function renderStep1(S) {
  const intelBlock = S.similarProfiles?.length
    ? `<div class="intel-card" style="margin-bottom:.875rem">
        <div class="ic-head"><span class="pill p-blue">Collective insight active — ${S.similarProfiles.length} similar profile${S.similarProfiles.length > 1 ? 's' : ''}</span></div>
        <div class="ic-body">${esc(buildIntelSummary(S.similarProfiles))}</div>
       </div>`
    : '';

  return `<div class="card">
    <div class="ch">
      <h2>What should this trust accomplish?</h2>
      <p>Select all that apply. These goals drive the trust structure, clause selection,
         and Rockefeller blueprint alignment score.</p>
    </div>

    ${intelBlock}

    <div class="ng">
      ${NEEDS.map(n => `
        <button class="nc${S.needs.includes(n.id) ? ' sel' : ''}" data-n="${n.id}">
          <span class="nl">${n.l}</span>
          <span class="nd">${n.d}</span>
        </button>`).join('')}
    </div>

    <div class="fld">
      <label>Additional context or special circumstances</label>
      <textarea id="fc2" placeholder="Blended family, prior marriage, active business, disabled child, international assets, family conflict concerns…">${esc(S.custom)}</textarea>
    </div>

    <div class="acts">
      <button class="btn" id="b1">← Back</button>
      <button class="btn pri" id="n1" ${S.needs.length === 0 ? 'disabled' : ''}>Next: Named parties →</button>
    </div>
  </div>`;
}

function renderStep2(S) {
  const items = S.parties.map((p, i) => `
    <div class="pi">
      <span class="pill p-green">${p.r}</span>
      <span style="flex:1;font-size:13px;padding:0 6px">${esc(p.n)}</span>
      <button class="rmv" data-i="${i}">Remove</button>
    </div>`).join('');

  return `<div class="card">
    <div class="ch">
      <h2>Named parties</h2>
      <p>Add all trustees, successor trustees, and beneficiaries.
         These names will appear in your trust framework document.</p>
    </div>

    <div class="pl">
      ${items || '<p style="font-size:12px;color:#aaa;padding:4px 0">No parties added yet.</p>'}
    </div>

    <div class="add-p">
      <select id="nr">${ROLES.map(r => `<option>${r}</option>`).join('')}</select>
      <input id="nn" placeholder="Full legal name or institution">
      <button class="btn" id="apb">+ Add</button>
    </div>

    <div class="rtip" style="margin-top:10px">
      <div class="rl">Rockefeller model</div>
      The 1934 and 1952 Rockefeller dynasty trusts used Chase Bank as institutional
      trustee — separating investment management from family decisions. Consider naming
      a bank trust department or ACTEC-affiliated trust company as co-trustee alongside
      a family trustee.
    </div>

    <div class="acts">
      <button class="btn" id="b2">← Back</button>
      <button class="btn pri" id="n2">Generate Rockefeller framework →</button>
    </div>
  </div>`;
}
