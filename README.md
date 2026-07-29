# Sprint Intelligence

A performance tracking system that replaces weekly PowerPoint reporting with a live dashboard powered by ClickUp.

Built for teams that run 2-week sprints and need to track individual efficiency, WBS progress, and planned-vs-actual time — without manually creating slides every week.

---

## Architecture

```
sprint-intelligence/
│
├── server/                          # Express API (Node.js)
│   ├── config/
│   │   └── clickupConfig.js         # ClickUp API credentials & constants
│   ├── controllers/
│   │   └── sprintController.js      # Route handlers (thin layer)
│   ├── middleware/
│   │   └── errorHandler.js          # Centralised error responses
│   ├── routes/
│   │   └── sprintRoutes.js          # REST endpoint definitions
│   ├── services/
│   │   ├── clickupService.js        # Direct ClickUp API integration
│   │   └── sprintAnalyticsService.js# Data processing & metric computation
│   ├── utils/
│   │   └── timeUtils.js             # ms ↔ hours conversions
│   ├── scripts/
│   │   └── diagnose.js              # ClickUp connectivity diagnostic
│   └── server.js                    # Express entry point
│
├── client/                          # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── layout/
│       │   │   ├── DashboardHeader.jsx
│       │   │   └── TabNav.jsx
│       │   ├── charts/
│       │   │   ├── StatusPieChart.jsx
│       │   │   └── TeamBarChart.jsx
│       │   ├── tables/
│       │   │   ├── TaskTable.jsx
│       │   │   └── MemberTaskTable.jsx
│       │   ├── Card.jsx
│       │   ├── MetricCard.jsx
│       │   ├── ProgressRing.jsx
│       │   ├── ProgressBar.jsx
│       │   ├── EfficiencyBadge.jsx
│       │   ├── StatusBadge.jsx
│       │   └── LoadingSkeleton.jsx
│       ├── pages/
│       │   ├── OverviewPage.jsx
│       │   ├── TeamPage.jsx
│       │   ├── WBSDashboard.jsx
│       │   └── TasksPage.jsx
│       ├── hooks/
│       │   └── useSprintData.js     # Central data hook
│       ├── services/
│       │   └── api.js               # HTTP client with retry logic
│       ├── utils/
│       │   ├── timeUtils.js
│       │   └── statusMapper.js
│       ├── styles/
│       │   └── global.css           # Design tokens & global styles
│       ├── App.jsx
│       └── main.jsx
│
├── .env.example                     # Environment template
├── .gitignore
├── package.json                     # Root scripts (dev, build, setup)
└── README.md
```

## Key Design Decisions

### 1. No AI dependency
The prototype routed ClickUp data through Anthropic's API using MCP. This has been removed entirely. The backend now calls the ClickUp REST API directly — faster, cheaper, and deterministic.

### 2. Backend-first data processing
All analytics (efficiency scores, status grouping, variance calculations) are computed server-side in `sprintAnalyticsService.js`. The frontend receives pre-processed data and only handles rendering.

### 3. Caching layer
Sprint data is cached server-side (default: 5 minutes TTL) using `node-cache`. The frontend also maintains an in-memory cache to avoid re-fetching when switching tabs. The "Refresh" button invalidates both layers.

### 4. Component isolation
Every UI element is a standalone component with no side effects. Pages compose components. The `useSprintData` hook manages all data state.

---

## Setup

### Prerequisites
- Node.js 18+
- A ClickUp workspace with sprint lists and time tracking enabled

### 1. Clone and install

```bash
git clone <repo-url>
cd sprint-intelligence
npm run setup
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
CLICKUP_API_TOKEN=pk_your_token_here
CLICKUP_WORKSPACE_ID=9013992885
CLICKUP_SPRINT_FOLDER_ID=90137660410
```

**Getting your ClickUp API token:**
1. Go to https://app.clickup.com/settings/apps
2. Click "Generate" under Personal API Token
3. Copy the token into `.env`

**Finding your Workspace ID:**
Look at any ClickUp URL: `https://app.clickup.com/{WORKSPACE_ID}/home`

**Finding your Sprint Folder ID:**
Navigate to your Sprint Board folder in ClickUp. The folder ID is in the URL.

### 3. Run in development

```bash
npm run dev
```

This starts both:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173` (with API proxy to backend)

### 4. Build for production

```bash
npm run build    # builds the React frontend
npm start        # starts Express serving both API + static frontend
```

In production, the Express server serves the built React app from `client/dist/` and handles API routes — single process, single port.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sprints` | List available sprint lists |
| GET | `/api/sprint/:id/summary` | Full analytics (summary + members + WBS + status) |
| GET | `/api/sprint/:id/tasks` | Flat task list with variance data |
| GET | `/api/sprint/:id/members` | Per-member performance metrics |
| GET | `/api/sprint/:id/wbs` | Per-project breakdown |
| GET | `/api/sprint/:id/member/:name` | Single member deep-dive |
| GET | `/api/diagnostics` | Step-by-step ClickUp connectivity check |
| POST | `/api/cache/invalidate` | Clear server cache |
| GET | `/api/health` | Health check |

### Example response: `/api/sprint/901325950934/summary`

```json
{
  "summary": {
    "totalTasks": 17,
    "completedTasks": 1,
    "completionRate": 6,
    "totalEstimateHrs": 67.5,
    "totalSpentHrs": 52.5,
    "overallEfficiency": 100,
    "efficiencyLabel": "Excellent"
  },
  "members": [
    {
      "name": "Rishi vendhan",
      "initials": "RV",
      "totalEstimateHrs": 33.3,
      "totalSpentHrs": 28.0,
      "completionRate": 8,
      "efficiency": 100,
      "efficiencyLabel": "Excellent",
      "completed": 1,
      "total": 12,
      "tasks": ["86aeyf5b3", "86aeyf5hv", ...]
    }
  ],
  "projects": [...],
  "statusDist": [...],
  "tasks": [...]
}
```

---

## Troubleshooting: "ClickUp returned no tasks"

Run the diagnostic before changing anything — it walks the whole chain
(token → workspace → folder → sprint lists → tasks) and stops at the first
broken link:

```bash
npm run diagnose              # checks the auto-selected sprint
npm run diagnose 901325950934 # checks a specific list
```

The same checks are available over HTTP at `GET /api/diagnostics`
(add `?sprintId=…` to target one sprint).

The usual causes, in order of how often they bite:

| Symptom | Cause | Fix |
|---|---|---|
| Dropdown is populated, dashboard shows 0 tasks | The auto-selected sprint is the *next* sprint — created in ClickUp but not started, so it holds no tasks | Fixed: `current` is now chosen by sprint start/due window, falling back to the newest sprint with a non-zero `task_count`, and only then to the newest by name |
| A past sprint shows 0 tasks | The sprint was archived in ClickUp. ClickUp omits archived tasks unless `archived=true`, and returns `200 OK` with an empty array rather than an error | Fixed: an empty live result is retried with `archived=true` |
| Every endpoint 404s | `CLICKUP_SPRINT_FOLDER_ID` holds a **Space** or **List** ID. All three ID types look identical | Use the Folder ID; `npm run diagnose` reports which one you have |
| `401 Team not authorized` | Token is invalid, has a `Bearer ` prefix, or belongs to a user who is not in that Space | Use a raw Personal API Token (`pk_…`) for a user who can see the Sprint Folder |
| Tasks load but all metrics read 0 / "No Data" | Tasks have no **time estimates** in ClickUp — efficiency is `estimate ÷ actual` | Set estimates in ClickUp; the diagnostic reports how many tasks have them |
| A status never counts as done | The status name is not in `STATUS_GROUPS` | Add it in `server/services/sprintAnalyticsService.js`; the diagnostic lists unmapped statuses |

Note that an empty result is cached for only 15 seconds (successful results use
`CACHE_TTL_SECONDS`), so a fix in ClickUp shows up on the next refresh rather
than five minutes later.

---

## Meeting Workflow

Replace the weekly PPT cycle with this flow:

1. **Open the dashboard** (bookmark `http://your-server:3001`)
2. **Select the current sprint** from the dropdown
3. **Overview tab** — discuss top-line metrics (2 min)
4. **Team tab** — expand each member, discuss variances (5 min)
5. **WBS tab** — check project-level progress (2 min)
6. **Tasks tab** — drill into flagged items with ⚠ (as needed)

Total meeting time: 10–15 min instead of 30–45 min of slide presentations.
