# Trust Doctor — Data Schema

Complete documentation of every field recorded by the collective intelligence engine.

## Design principles

1. **Structural signal only** — every field describes the *shape* of a trust, never its *contents*
2. **No PII ever** — no names, addresses, dollar amounts, document text, or family member data
3. **Shared anonymously** — records go into a shared dataset that improves recommendations for all users
4. **Silent failure** — data collection never breaks the main app; all writes are try/catch wrapped

---

## Profile record

Stored at key: `td_profile:{uid}` (shared = true)  
Written at phases: `intake`, `rec_complete`, `doc_generated`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique hash (timestamp + random). Never reused. |
| `ts` | number | Unix timestamp in ms. Enables trend analysis and staleness detection. |
| `phase` | string | `intake` \| `rec_complete` \| `doc_generated` |
| `state` | string | 2-letter state code (e.g. `KS`). Enables state-specific pattern matching. |
| `estate_bracket` | string | One of 7 value tiers. Never the raw dollar amount. Tiers: `under_250k` / `250k_500k` / `500k_1m` / `1m_2m` / `2m_5m` / `5m_14m` / `over_14m` |
| `family_complexity` | string | `single_no_dependents` / `single_with_beneficiaries` / `couple` / `family_with_minors` / `multigenerational` |
| `party_count` | number | Total named parties. Correlates with document complexity. |
| `goals` | string[] | Array of goal IDs: `estate` `ap` `biz` `tax` `dynasty` `minor` `sn` `sp` `phil` `priv` |
| `goal_count` | number | Quick filter — how many goals selected. |
| `has_dynasty_goal` | boolean | High signal for dynasty trust recommendation. |
| `has_charitable` | boolean | Triggers CRT / private foundation recommendations. |
| `has_special_needs` | boolean | Triggers SNT structure and ABLE account awareness. |
| `has_business` | boolean | Triggers business succession clause weighting. |
| `has_spendthrift` | boolean | Spendthrift protection needed. |
| `has_minor` | boolean | Minor beneficiary trust provisions needed. |
| `custom_length` | number | Character count of the custom context field. Signal for complexity without storing content. |
| `rec_scores` | object | Pillar scores 0–10: `{dynasty_s, gov, gst, ins, char, const}` |
| `has_similar_profiles` | boolean | Was collective intelligence available for this session? |
| `similar_profile_count` | number | How many similar profiles were injected into the AI prompt. |

---

## Doc audit record

Stored at key: `td_docaudit:{uid}` (shared = true)  
Written at phase: `doc_audit`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique hash. |
| `ts` | number | Unix timestamp. |
| `phase` | string | Always `doc_audit`. |
| `state` | string | Grantor's state at time of audit. |
| `estate_bracket` | string | Same 7-tier bracket as profile records. |
| `family_complexity` | string | Same complexity categories. |
| `goals` | string[] | Goals active at time of audit. |
| `doc_pillar_scores` | object | Per-pillar 0–10 scores from the actual uploaded document. |
| `gap_count` | number | Total gaps identified. |
| `critical_gap_count` | number | Critical gaps — highest signal for what commonly fails. |
| `moderate_gap_count` | number | Moderate gaps. |
| `minor_gap_count` | number | Minor gaps. |
| `gap_categories` | string[] | Anonymized gap titles as slug strings (e.g. `trustee_succession_missing`). Never original text. |
| `strength_categories` | string[] | Anonymized strength titles. What good documents commonly include. |
| `improvement_count` | number | Number of improvements suggested. |
| `overall_doc_score` | number | Composite Rockefeller alignment score 0–100 for this document. |

---

## Similarity scoring algorithm

When a new user reaches Step 3 (Framework), the engine:

1. Loads the last 80 `td_profile:*` records from shared storage
2. Filters to `phase === 'rec_complete'` only
3. Scores each record against the current profile:

| Match | Points |
|-------|--------|
| Same state | +3 |
| Same estate bracket | +2 |
| Same family complexity | +2 |
| Each overlapping goal | +1 |

4. Filters to records scoring ≥ 3
5. Returns top 5 by score

The top matches are summarized into a **collective intelligence context block** injected directly into the AI recommendation prompt, before the main analysis runs.

---

## Storage keys

| Prefix | Shared | Purpose |
|--------|--------|---------|
| `td_profile:` | true | Profile events (all phases) |
| `td_docaudit:` | true | Document audit events |
| `td_session_main` | false | User's private session save (personal data) |

Personal session saves (`td_session_main`) are private (shared=false) and contain the full session including grantor details. These are never exposed to other users and are not part of the collective dataset.
