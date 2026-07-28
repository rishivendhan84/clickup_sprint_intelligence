# Sprint Intelligence → Daily Status Tracker

**End-to-end plan to repurpose Sprint Intelligence from time/efficiency reporting into a daily status system for the whole team, with ClickUp as the published record.**

Source of truth for the current process: `DifferentHair_ScrumMaster_Hub_v2`
([sheet](https://docs.google.com/spreadsheets/d/1FYzvFkPwO17p_cSpjNQxVFjtcuKtCSjsCiMBzUbIZYs/edit)),
owned by bhuvaneshwari@differenthair.com, last modified 28-Jul-2026.

---

## 1. What the sheet actually does today

The workbook has 11 logical sections. Only one of them is a *daily* process — the
**Daily Standup Log**. Everything else is planning, reference, or template data.

| Section | Purpose | Cadence | Real data? |
|---|---|---|---|
| Product Backlog | Links to per-project tracker sheets | Ad-hoc | Yes |
| Sprint Planning | Task plan per member per sprint | Per sprint | Yes |
| **Daily Standup Log** | **Per-member daily status** | **Daily** | **Yes — 60 rows** |
| Blocker Tracking Record | Blockers, raised-by, notes | Ad-hoc | Yes — 5 rows |
| Sprint Execution Tracker | Week 1/2 task grid + RAG | Weekly | Partial |
| Sprint Backlogs | Story IDs, points, est. hours, QA sign-off | Per sprint | Looks like sample data |
| Retrospective Log | What went well / didn't | Per sprint | Empty |
| Testing Documents | Links to QA artefacts | Ad-hoc | Yes |
| All Projects Documents | Version/doc links (incl. a ClickUp doc) | Ad-hoc | Yes |
| Velocity & Burndown | Points planned/done, velocity %, burndown | Per sprint | Sample data |
| Team Capacity / Directory / Cadence | Roster, allocation, meeting schedule | Static | Yes |

### The daily flow (what we are replacing)

Bhuvana fills the **Daily Standup Log** each working day — one row per person:

```
Date | Day | Members | Role & Project | Task | Comments | Status
     | Today action item | Blocker Description | Raised By | Notes
```

Meeting is **9:15–10:00 AM IST**, Sat/Sun are holidays.

**Measured from the live data (11-Jun → 19-Jun-2026, 60 rows, 7 working days):**

| Column | Fill rate | Verdict |
|---|---|---|
| Task | 60/60 (100%) | Core — keep |
| Status | 60/60 (100%) | Core — keep |
| Comments | 24/60 (40%) | Useful — keep, optional |
| Blocker Description | 5/60 (8%) | Keep, but restructure (see 2.3) |
| Raised By | 4/60 (7%) | Keep with blocker |
| Notes | 4/60 (7%) | Merge into comments |
| **Today action item** | **0/60 (0%)** | **Dead column — drop** |

Team logging daily: 8 members until 16-Jun, 9 after (Thabu Priya joins 16-Jun).

---

## 2. Problems found in the current data

These are the reasons a naive "read the sheet, push to ClickUp" script will not
be reliable. Each needs a decision or a fix.

### 2.1 Member identity is ambiguous

The roster contains **`Anandh`**, **`Ananth`**, and **`Anandharaj`**.
The Team Directory lists `Anandh` (QA, Production Planning, full allocation) and
`Ananth` (QA, shared across NPS + H&C + Vitabea) as **two different people**, but
the Daily Standup Log only ever uses `Anandh`, and the testing documents use
`Anandharaj`. Also `Chandhru` (standup) vs `Chandru` (backlog tab).

> **Decision required:** are Anandh / Ananth / Anandharaj one person or two (or three)?
> Every per-person report depends on this. This is the single highest-priority
> question — nothing downstream is trustworthy until it is settled.

### 2.2 Status vocabulary does not match its own legend

The legend says `Done · In Progress · Blocked · Not Started`.
What is actually typed:

| Value used | Count | Note |
|---|---|---|
| `completed` | 23 | legend says "Done" |
| `In Progress` | 16 | matches |
| `In Review` | 13 | not in legend |
| `on leave` | 4 | not in legend — attendance, not status |
| `Hold` | 1 | not in legend |
| `Staus` | 3 | **typo** — someone typed the header into the cell |

`Done`, `Blocked` and `Not Started` are **never used**. Free-text entry is the cause.

### 2.3 The blocker table is glued onto unrelated rows

The Blocker Tracking Record shares row space with the standup log but is a
**logically separate table**. The evidence: the blocker
*"Yogaram needs Shopify KT from Yuvaraj"* appears on **Bhuvana's** 11-Jun row and again on
**Karthick's** 12-Jun row. Neither of them is the blocked party — Yogaram is.

Reading the sheet positionally attributes blockers to the wrong people. Blockers
must become first-class records with their own owner, not a column.

### 2.4 Four conflicting sprint date ranges

| Where | Range |
|---|---|
| Sprint Planning header | 22-Jun → 4-Jul-2026 |
| Sprint Planning task table | 8-Jun → 19-Jun-2026 |
| Sprint Execution Tracker | "Sprint 1: 08 Jun – 19 Jun 2026" |
| Velocity Log (S1) | 1-Jun → 14-Jun-2026 |

Any "current sprint" logic needs one authoritative definition.

### 2.5 Merged cells break machine reading

Date and Day are merged vertically across each day's member rows. The Sheets API
returns **blank** for continuation cells, so an importer must forward-fill. The
existing export also emits literal `[merged]` markers. Handled in the importer
(section 6), but it is why scraping this sheet on a schedule is fragile.

### 2.6 Velocity, burndown and Sprint Backlog tabs are sample data

Clean round numbers (28/22 pts, 79%), story IDs `PP-001…`, and burndown values
that stop after day 2. These are template rows, not team output. **Do not migrate
them** and do not build reports on them.

---

## 3. Target design

### 3.1 Principle: stop syncing two systems, move the entry point

The fragile step in "sheet → ClickUp" is **parsing the sheet**: merged cells,
free-text names, typos, and false blocker associations. Every one of the problems
in section 2 exists because the input is an unvalidated grid.

The reliable fix is not a better parser — it is to **replace the standup tab with
a purpose-built entry screen** that produces structured data at the source.
Sprint Intelligence becomes the system of record; ClickUp becomes the published
mirror.

```
BEFORE   Bhuvana → Google Sheet → (manual reading in meeting)
                                → ClickUp updated separately, by hand

AFTER    Bhuvana → Sprint Intelligence entry grid (validated)
                        │
                        ├─→ local DB  ── source of truth, always writable
                        │
                        └─→ outbox worker ─→ ClickUp  (retried, idempotent)
                                          ─→ daily digest doc
```

Bhuvana's daily effort should go **down**, not up: the grid pre-fills yesterday's
task per person, so most days are a status dropdown and a tweak — target under
3 minutes for all 9 people.

### 3.2 Why not the alternatives

| Approach | Verdict |
|---|---|
| Apps Script on the sheet → ClickUp | Inherits every data-quality problem in §2. No retry/idempotency story. Trigger quotas. Debugging is painful. |
| Server polls Sheets API → ClickUp | Same parsing problems, plus merged-cell forward-fill and a service-account setup. Good enough for a **one-time backfill**, not for daily operation. |
| Zapier / Make | Volume is fine (~90 ops/sprint) but no idempotency control, another vendor, and failures are silent. |
| ClickUp native Sheets integration | Does not support this row-per-person-per-day shape. |
| **App as entry point → ClickUp API** | **Recommended.** No parsing step. Validation at source. Full control of retries and idempotency. |

The existing sheet stays available read-only as the historical archive.

### 3.3 How status lands in ClickUp

ClickUp is task-centric; a standup entry is person-and-day-centric. Three ways to
bridge that, and the volume for a 10-working-day sprint with 9 people:

| Option | Volume | Trade-off |
|---|---|---|
| One task per standup entry | ~90 tasks/sprint | Unusable noise. Rejected. |
| **Task per person per sprint + daily comment** | **9 tasks/sprint, 9 comments/day** | **Recommended.** Assignee = the person, so it appears in their ClickUp inbox. Clean per-person history. |
| Daily digest Doc page | 1 page/day | Reads exactly like the sheet — ideal for the 9:15 meeting. Poor for querying. |
| Comment on the real sprint task | varies | Best fidelity, but requires mapping free-text task names → task IDs. Defer to Phase 6. |

**Recommendation: task-per-person-per-sprint as the primary record, plus a
generated daily digest Doc page.** That is ~10 API writes per day against a
100 req/min limit — three orders of magnitude of headroom.

Blockers become **real ClickUp tasks** in a Blockers list, assigned to the person
who can unblock it, linked to the affected person's status task. That fixes §2.3
properly: a blocker gets an owner and an age, not a text cell.

**Proposed ClickUp structure** (workspace `9013992885`, confirmed from a doc link
in the sheet):

```
Space: Scrum
├── Folder: Daily Status
│   ├── List: Daily Status — S1
│   │   ├── Daily Status — Bhuvana — S1      (assignee: Bhuvana)
│   │   ├── Daily Status — Karthick — S1
│   │   └── … one per active member
│   └── List: Blockers
│       └── one task per blocker, assigned to the resolver
└── Doc: Daily Standup Digest
    └── one page per working day
```

Custom fields on each status task: `Latest Status`, `Last Updated`, `Blocked`,
`Project`.

---

## 4. What gets removed

The user requirement is explicit: **no time-tracked or efficiency reporting.**
Concretely, in this repo:

**Delete**
- `server/services/sprintAnalyticsService.js` → `computeEfficiency()`, `efficiencyLabel()`
- `client/src/components/EfficiencyBadge.jsx`
- `client/src/components/charts/TeamBarChart.jsx` (estimated vs actual hours)
- `client/src/utils/timeUtils.js`, `server/utils/timeUtils.js` (ms↔hours)
- Overview metric cards: `TIME EFFICIENCY`, `HRS EST / ACTUAL`
- `TaskTable` columns: `ESTIMATED`, `ACTUAL`, `VARIANCE`, and the ⚠ over-budget flag
- `timeEstimate` / `timeSpent` / `variance` / `overBudget` from the task shape
- `getTaskTimeEntries()` in `clickupService.js`

**Keep and repoint at standup data**
- Status distribution (pie) — becomes *today's* status mix
- Per-member grouping — becomes the person view
- Per-project grouping (WBS) — becomes status-by-project
- `Card`, `MetricCard`, `ProgressBar`, `StatusBadge`, `LoadingSkeleton`, layout, error handling
- The demo-mode mechanism (`DEMO_MODE`) — re-point at sample standup data

> Note: efficiency scoring was already misleading — it capped at 100, so anyone at
> or under estimate scored identically regardless of margin. Removing it resolves
> that rather than needing a fix.

---

## 5. Data model

SQLite is sufficient (9 members × ~10 days ≈ 90 rows/sprint); Postgres if it is
already available. Schema:

```sql
members (
  id, display_name, aliases_json, role, clickup_user_id,
  active, created_at
)                                    -- aliases_json resolves §2.1

projects (
  id, code, name, clickup_list_id    -- P1: PPS, P2: SSO, P3: H&C, P4: Vitabea, P5: CCH
)

sprints (
  id, name, start_date, end_date,
  clickup_folder_id, is_current      -- one authoritative range, resolves §2.4
)

standup_entries (
  id, entry_date, member_id, project_id,
  task_text, status, comments,
  entered_by, created_at, updated_at,
  UNIQUE (entry_date, member_id)     -- idempotency key
)

blockers (
  id, raised_on, description,
  affects_member_id, owner_member_id, -- separate fields; resolves §2.3
  status, resolved_on, clickup_task_id
)

outbox (
  id, entity_type, entity_id, payload_json,
  state, attempts, last_error, next_attempt_at
)
```

**Status enum** (replaces free text, resolves §2.2):

`Not Started` · `In Progress` · `In Review` · `Done` · `On Hold` · `Blocked` · `On Leave`

Legacy mapping for the backfill: `completed`→`Done`, `Hold`→`On Hold`,
`on leave`→`On Leave`, `Staus`→**flag for manual review** (3 rows).

`On Leave` is attendance, not work status — it should be recorded on the entry but
excluded from status-mix charts, otherwise leave dilutes the team's progress picture.

---

## 6. Reliability design

This is the part that determines whether the ClickUp push can be trusted.

1. **Local write first.** An entry is committed to the local DB and the UI confirms
   success before any ClickUp call. ClickUp being down never blocks the standup.
2. **Outbox pattern.** Every push is queued as a row with
   `state ∈ {pending, sent, failed}`. A worker drains it.
3. **Idempotency.** Key is `(entry_date, member_id)`. The comment body carries a
   hidden marker `<!-- si:2026-06-11:bhuvana -->`; the writer looks for it and
   **edits** the existing comment instead of appending a duplicate. Re-running the
   push is always safe.
4. **Backoff.** Exponential retry (2s → 4s → 8s → …, capped), honouring
   `Retry-After` on HTTP 429. ClickUp allows 100 req/min per token; expected load
   is ~10/day, so limits should never be hit — but the handling exists so a burst
   during backfill cannot lose data.
5. **Nightly reconciliation.** Compare local entries against what ClickUp actually
   holds for the sprint; report drift. Silent divergence is the failure mode that
   erodes trust in any mirror.
6. **Coverage alert.** If a working day passes with members missing an entry, flag
   it. Today this failure is invisible — a blank row looks the same as a quiet day.
7. **Auth.** Personal API token in `.env` (already gitignored) for a single internal
   service. OAuth only if per-user attribution in ClickUp is needed later.
   The token shared in chat must be rotated.

---

## 7. Screens

| Screen | Who | Purpose |
|---|---|---|
| **Daily Entry grid** | Bhuvana | All active members as rows; task pre-filled from yesterday; status dropdown; one Save. Target < 3 min. |
| **Today's Standup** | Whole team, 9:15 AM | Read-only, grouped by project, blockers pinned at top. The screen that replaces reading the sheet aloud. |
| **Person view** | Lead / 1:1s | One member across the sprint — "what has X been doing". |
| **Blocker board** | Scrum master | Open blockers with age and owner. Age is the number that matters. |
| **Coverage** | Bhuvana | Who is missing an update today. |

Sprint-level rollup replaces the Overview tab: entries logged, status mix,
open blockers, members on leave. **No efficiency, no hours.**

---

## 8. Phased delivery

| Phase | Scope | Depends on |
|---|---|---|
| **0. Decisions** | Resolve §2.1 identity, §2.4 sprint dates, confirm status enum | — |
| **1. Strip** | Remove time/efficiency code (§4). App still runs on demo data. | — |
| **2. Data layer** | Schema, member/project/sprint seed from the sheet's Team Directory | 0 |
| **3. Entry + read** | Daily Entry grid, Today's Standup, Person view | 2 |
| **4. Backfill** | One-time importer for the 60 existing rows (forward-fill merged cells, map legacy statuses, quarantine the 3 `Staus` rows) | 2 |
| **5. ClickUp writer** | Outbox, idempotent push, reconciliation, digest doc | 3 |
| **6. Blockers** | Blocker board + ClickUp Blockers list | 5 |
| **7. Cutover** | Run parallel one sprint, then sheet → read-only archive | 5 |
| **8. Optional** | Link entries to real ClickUp sprint tasks; per-member self-service entry | 7 |

Phases 1–3 deliver standalone value: the team can run standup off the app before
any ClickUp integration exists.

---

## 9. Open decisions

1. **Anandh / Ananth / Anandharaj** — one person or several? (§2.1) *Blocking.*
2. **Who enters** — Bhuvana for everyone (current), each member self-serve, or
   hybrid (members enter, Bhuvana fills gaps)? Changes the entry UI substantially.
3. **ClickUp shape** — confirm task-per-person-per-sprint + daily digest (§3.3).
4. **Sheet's fate** — retire after cutover, or keep mirrored indefinitely?
5. **Sprint definition** — which of the four date ranges is authoritative? (§2.4)
6. **`CLICKUP_SPRINT_FOLDER_ID`** — still unverified; `npm run verify` will list
   the real folder IDs once run somewhere with network access to ClickUp.
