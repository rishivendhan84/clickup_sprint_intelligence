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
│   │   ├── clickupConfig.js         # ClickUp API credentials & constants
│   │   └── loadEnv.js               # Loads .env from repo root or server/
│   ├── controllers/
│   │   └── sprintController.js      # Route handlers (thin layer)
│   ├── middleware/
│   │   └── errorHandler.js          # Centralised error responses
│   ├── routes/
│   │   └── sprintRoutes.js          # REST endpoint definitions
│   ├── services/
│   │   ├── clickupService.js        # Direct ClickUp API integration
│   │   ├── demoData.js              # Sample dataset used by DEMO_MODE
│   │   └── sprintAnalyticsService.js# Data processing & metric computation
│   ├── utils/
│   │   └── timeUtils.js             # ms ↔ hours conversions
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
- Node.js 18+ (the backend relies on the built-in `fetch`; `npm run dev` uses `node --watch`, which needs 18.11+)
- A ClickUp workspace with sprint lists and time tracking enabled — *not* required for demo mode, below

### 1. Clone and install

```bash
git clone <repo-url>
cd sprint-intelligence
npm run setup
```

`npm run setup` installs the root, `server/`, and `client/` dependency trees.

### 2. Configure environment

```bash
cp .env.example .env
```

`.env` belongs at the **repo root** (`server/.env` also works and takes precedence). It is gitignored — never commit a real token.

#### Option A — demo mode (no ClickUp account needed)

To see the dashboard running immediately, set one variable and skip the rest:

```env
DEMO_MODE=true
```

The server then answers every endpoint from the bundled sample sprint in `server/services/demoData.js`. Two sprints, four members, and a realistic status/variance spread — enough to exercise all four tabs. Useful for UI work and for reviewing changes without workspace access.

#### Option B — live ClickUp data

```env
CLICKUP_API_TOKEN=pk_your_token_here
CLICKUP_WORKSPACE_ID=9013992885
CLICKUP_SPRINT_FOLDER_ID=90137660410
```

The server exits at startup if `CLICKUP_API_TOKEN` or `CLICKUP_WORKSPACE_ID` is missing and `DEMO_MODE` is off. `CLICKUP_SPRINT_FOLDER_ID` is only needed by `GET /api/sprints`.

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

Open `http://localhost:5173`. Vite forwards `/api/*` to the backend, so there is no CORS setup to do.

### 4. Build for production

```bash
npm run build    # builds the React frontend
npm start        # starts Express serving both API + static frontend
```

In production, the Express server serves the built React app from `client/dist/` and handles API routes — single process, single port. Set `NODE_ENV=production` to disable request logging, error stack traces in responses, and cross-origin requests; then browse to `http://localhost:3001`.

### Environment reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DEMO_MODE` | no | `false` | Serve bundled sample data instead of calling ClickUp |
| `CLICKUP_API_TOKEN` | yes* | — | Personal API token |
| `CLICKUP_WORKSPACE_ID` | yes* | — | Workspace the sprints live in |
| `CLICKUP_SPRINT_FOLDER_ID` | for `/api/sprints` | — | Folder holding the sprint lists |
| `PORT` | no | `3001` | Express port (the Vite proxy expects 3001) |
| `NODE_ENV` | no | `development` | `production` enables the hardened/static-serving path |
| `CACHE_TTL_SECONDS` | no | `300` | Server-side cache lifetime for ClickUp responses |

\* unless `DEMO_MODE=true`.

### Troubleshooting

- **`Missing required env var(s)` on startup** — `.env` is absent or incomplete. Copy `.env.example`, or set `DEMO_MODE=true`.
- **`CLICKUP_SPRINT_FOLDER_ID not configured`** — the sprint dropdown calls `/api/sprints`, which needs the folder ID.
- **Frontend loads but every request fails** — the backend isn't up. `curl http://localhost:3001/api/health` should return `{"status":"ok"}`.
- **Port already in use** — set `PORT` for the backend; change `server.port` in `client/vite.config.js` (and the proxy target) for the frontend.

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

## Meeting Workflow

Replace the weekly PPT cycle with this flow:

1. **Open the dashboard** (bookmark `http://your-server:3001`)
2. **Select the current sprint** from the dropdown
3. **Overview tab** — discuss top-line metrics (2 min)
4. **Team tab** — expand each member, discuss variances (5 min)
5. **WBS tab** — check project-level progress (2 min)
6. **Tasks tab** — drill into flagged items with ⚠ (as needed)

Total meeting time: 10–15 min instead of 30–45 min of slide presentations.
