/* js/constants.js — all static data, no logic */

const STEPS = [
  { l: 'Your info' },
  { l: 'Goals' },
  { l: 'Parties' },
  { l: 'Framework' },
  { l: 'Doc review' }
];

const NEEDS = [
  { id: 'estate',  l: 'Estate transfer',          d: 'Pass assets, skip probate' },
  { id: 'ap',      l: 'Asset protection',          d: 'Shield from creditors & lawsuits' },
  { id: 'biz',     l: 'Business succession',       d: 'Transfer ownership across generations' },
  { id: 'tax',     l: 'Tax strategy',              d: 'Reduce estate, gift and GST taxes' },
  { id: 'dynasty', l: 'Dynasty / multigenerational', d: 'Preserve wealth 3+ generations' },
  { id: 'minor',   l: 'Minor beneficiaries',       d: 'Hold assets until children are adults' },
  { id: 'sn',      l: 'Special needs',             d: 'Provide for a disabled dependent' },
  { id: 'sp',      l: 'Spendthrift protection',    d: 'Guard heirs from poor decisions' },
  { id: 'phil',    l: 'Charitable legacy',         d: 'Foundation or giving mission' },
  { id: 'priv',    l: 'Privacy',                   d: 'Keep affairs out of public record' }
];

const PILLARS = [
  { id: 'dynasty_s', ic: '🏰', l: 'Dynasty structure' },
  { id: 'gov',       ic: '⚖️',  l: 'Professional governance' },
  { id: 'gst',       ic: '↷',  l: 'GST tax strategy' },
  { id: 'ins',       ic: '🛡',  l: 'Insurance cascade' },
  { id: 'char',      ic: '🤝', l: 'Charitable integration' },
  { id: 'const',     ic: '📜', l: 'Family constitution' }
];

const ROLES = [
  'Trustee',
  'Successor Trustee',
  'Beneficiary',
  'Co-Grantor',
  'Trust Protector',
  'Investment Advisor'
];

const SA = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
  CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia',
  HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas',
  KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts',
  MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana',
  NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico',
  NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
  OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
  VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin',
  WY:'Wyoming', DC:'D.C.'
};

/* States with favorable dynasty trust laws */
const DYNASTY_STATES = ['SD', 'NV', 'DE', 'WY', 'AK'];

/* Classify estate value into a bracket — never stores raw number */
function estateBracket(v) {
  if (!v) return 'unknown';
  const raw = v.replace(/[^0-9.kmb]/gi, '');
  const m = /k$/i.test(v) ? 1000 : /m$/i.test(v) ? 1_000_000 : /b$/i.test(v) ? 1_000_000_000 : 1;
  const val = parseFloat(raw) * m;
  if (val < 250_000)    return 'under_250k';
  if (val < 500_000)    return '250k_500k';
  if (val < 1_000_000)  return '500k_1m';
  if (val < 2_000_000)  return '1m_2m';
  if (val < 5_000_000)  return '2m_5m';
  if (val < 14_000_000) return '5m_14m';
  return 'over_14m';
}

/* Classify family structure from parties list */
function familyComplexity(parties) {
  const roles  = parties.map(p => p.r);
  const benes  = parties.filter(p => p.r === 'Beneficiary').length;
  const hasCo  = roles.includes('Co-Grantor');
  if (benes === 0 && !hasCo) return 'single_no_dependents';
  if (benes <= 2 && !hasCo)  return 'single_with_beneficiaries';
  if (hasCo && benes <= 3)   return 'couple';
  if (benes <= 6)             return 'family_with_minors';
  return 'multigenerational';
}

/* Tiny unique ID — no PII */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
