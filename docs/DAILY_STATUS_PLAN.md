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

### 3.3 How status lands in ClickUp — **DECIDED: comment on the real sprint task**

Status is posted as a comment on the **actual ClickUp task the work belongs to**.
This gives the highest fidelity — progress lives on the work item, visible to
anyone looking at that task, not in a parallel status silo.

The cost is that it needs a task mapping, and the standup data is free text. Two
measured facts from the existing 60 rows determine the design:

**(a) 28% of entries have no sprint task to attach to.**

| | Rows | Examples |
|---|---|---|
| Plausibly maps to a sprint task | 43/60 (72%) | "Cache storage in PPS", "NPS Bug fixing continues" |
| Nothing to attach to | 17/60 (28%) | `on leave`, "KT from Yuvaraj for Shopify", "Training", "yet to start" |

Leave, knowledge-transfer sessions, training and onboarding are real reported work
with no backlog item. They cannot be dropped.

**(b) One standup row frequently covers several tasks.**

> "Prototype Phase 2 **+** SEO Agent task"
> "Blog Main page (2nd half) **+** CSAT (1st half)"
> "Bug fixed & deployed, Testing in Progress, SSO deployment support continues"

So a row is not one status — it is *n* statuses sharing a cell.

**Design that follows from (a) and (b):**

1. **Map at entry time, not after the fact.** The entry grid gives Bhuvana a
   searchable picker scoped to that member's assigned tasks in the current sprint.
   She selects the task instead of typing its name. This converts an unreliable
   fuzzy-match into an exact reference chosen by a human who was just on the call —
   reliable by construction, and the reason §2's data-quality problems don't
   reappear here.
2. **A member's day is a list of lines, not one line.** Each line = one task +
   status + note. The grid lets her add a second or third line for a member; most
   days will be one.
3. **Unmappable work gets a per-person catch-all.** One task per member per sprint,
   `Non-sprint work — <name> — S1`, receives leave, KT, training and admin entries.
   Nothing is lost, and the 28% stays visible.
4. **Idempotency key becomes `(date, member, clickup_task_id)`** — the hidden
   comment marker is `<!-- si:2026-06-11:anandh:86xxxxx -->`.

**Prerequisite — this option depends on ClickUp task hygiene.** Commenting on real
sprint tasks requires those tasks to *exist* in ClickUp and be assigned to the
right people. See §6.1 — this is currently **unverified and is the main risk to
this approach**.

Blockers become **real ClickUp tasks** in a Blockers list, assigned to whoever can
unblock them, and linked to the task they block. That fixes §2.3 properly: a
blocker gets an owner and an age, not a text cell.

**Proposed ClickUp structure** (workspace `9013992885`, confirmed from a doc link
in the sheet):

```
Space: Scrum
├── Folder: Sprints
│   └── List: Sprint S1          ← real work items, comments land here
├── List: Non-sprint work
│   ├── Non-sprint work — Bhuvana — S1     (leave / KT / training)
│   └── … one per active member
└── List: Blockers
    └── one task per blocker, assigned to the resolver
```

Optional custom fields on sprint tasks: `Latest Status`, `Last Updated`, `Blocked`
— so the current state is visible without opening the comment thread.

Volume: ~12–15 comments/day against a 100 req/min limit. No rate-limit concern.

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
  clickup_task_id,                   -- NULL = non-sprint work (leave/KT/training)
  line_no,                           -- a member's day can have several lines (§3.3b)
  task_text,                         -- free text kept for readability + audit
  status, comments,
  entered_by, created_at, updated_at,
  UNIQUE (entry_date, member_id, line_no),
  UNIQUE (entry_date, member_id, clickup_task_id)   -- idempotency key for the push
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

### 6.1 Open risk — the team's ClickUp workspace is unverified

**This is the biggest unknown in the plan and it gates §3.3.**

What is confirmed:
- The team's workspace is **`9013992885`** — proven by a doc link inside the sheet.
- The ClickUp account currently connected to this session is a *different*
  workspace, **`9016902951`**: two spaces with placeholder names ("Space",
  "List"), **zero folders**, and **two members** (Amarnadh Chegerla, Sharan
  Prathap) — neither of whom is on the scrum team.
- Direct API access to `api.clickup.com` is blocked by this environment's egress
  policy, so `9013992885` could not be inspected.

What that means: **it is not yet known whether the sprint tasks exist in ClickUp
at all.** Two signals suggest ClickUp may be thinly used for task tracking — the
entire workbook contains exactly **one** ClickUp link (a document, not a task),
while every actual tracker it references is a Google Sheet.

Consequences for the chosen approach:

| If… | Then |
|---|---|
| Sprint tasks exist in `9013992885`, assigned | §3.3 works as written. Proceed. |
| Tasks exist but are unassigned / stale | Add a hygiene pass before Phase 5: assign owners, close dead items. |
| Tasks do not exist | The backlog must be created in ClickUp first — a new phase before Phase 5, and a materially larger project. The Sprint Backlog tab is sample data (§2.6), so it cannot seed this. |

**First action:** run `npm run verify` from a machine with network access to
ClickUp. It lists every workspace, folder and list the token can see, which
settles this in seconds.

### 6.2 Delivery guarantees

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
| **Daily Entry grid** | Bhuvana | All active members as rows; each row expandable to several task lines (§3.3b); task chosen from a picker scoped to that member's sprint tasks, pre-filled from yesterday; status dropdown; one Save. Target < 3 min. |
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
| **0. Verify ClickUp** | Run `npm run verify` against `9013992885`. Confirm sprint tasks exist and are assigned. Settle the sprint date range. | — |
| **1. Strip** | Remove time/efficiency code (§4). App still runs on demo data. | — |
| **2. Data layer** | Schema, member/project/sprint seed. Merge the Anandh/Ananth records. | 0 |
| **3. Entry + read** | Daily Entry grid with per-line task picker, Today's Standup, Person view | 2 |
| **4. Backfill** | One-time importer for the 60 existing rows (forward-fill merged cells, map legacy statuses, split multi-task cells, quarantine the 3 `Staus` rows) | 2 |
| **4a. Task hygiene** | **Only if §6.1 finds tasks missing/unassigned** — create or fix the ClickUp backlog | 0 |
| **5. ClickUp writer** | Outbox, idempotent per-task comments, reconciliation | 3, 4a |
| **6. Blockers** | Blocker board + ClickUp Blockers list | 5 |
| **7. Cutover** | Run parallel one sprint, then sheet → read-only archive | 5 |
| **8. Optional** | Per-member self-service entry; auto-suggest task from previous day | 7 |

Phases 1–3 deliver standalone value: the team can run standup off the app before
any ClickUp integration exists. That sequencing is deliberate — it means a bad
answer to §6.1 delays the ClickUp mirror without blocking the daily process.

---

## 9. Decisions

### Settled

| # | Decision | Consequence |
|---|---|---|
| 1 | **Anandh / Ananth / Anandharaj = one person** | One member record with three aliases. The Team Directory's separate "Ananth" row is a duplicate — the two differing allocations (full on Prod. Planning vs shared across NPS+H&C+Vitabea) must be merged into one real allocation. **This person is the QA for all four projects**, which makes them a single point of failure worth surfacing on the capacity view. |
| 2 | **Bhuvana enters for everyone** | Keeps today's process. No per-user auth needed in v1 — one operator screen. Lowest change-management cost, fastest to build. Risk stays as it is today: if Bhuvana is away, nothing is logged — the Coverage screen (§7) makes that visible instead of silent. |
| 3 | **Comment on the real sprint tasks** | Highest-fidelity option. Requires entry-time task picking, per-line entries, and a non-sprint catch-all (§3.3). **Gated on §6.1.** |
| 4 | **Sheet becomes a read-only archive after cutover** | No write-back to Sheets, no second sync path. History stays viewable. One-time backfill only (Phase 4). |

### Still open

5. **Sprint definition** — which of the four conflicting date ranges is
   authoritative? (§2.4) Needed before "current sprint" means anything.
6. **Does workspace `9013992885` contain the sprint tasks?** (§6.1) The one
   answer that could change the size of this project. Run `npm run verify`.
7. **`CLICKUP_SPRINT_FOLDER_ID`** — unverified; same command resolves it.
