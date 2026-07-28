/**
 * Bundled sample data for DEMO_MODE.
 *
 * Lets the dashboard run end-to-end without a ClickUp token — useful for local
 * development, UI work, and reviewing a PR without workspace access. Shapes
 * match exactly what `clickupService` returns after normalisation, so nothing
 * downstream needs to know demo mode exists.
 */

const PEOPLE = [
  { id: 1, username: "Rishi Vendhan", initials: "RV", color: "#22d3ee", email: "rishi@example.com" },
  { id: 2, username: "Ana Duarte", initials: "AD", color: "#a78bfa", email: "ana@example.com" },
  { id: 3, username: "Marcus Hale", initials: "MH", color: "#10b981", email: "marcus@example.com" },
  { id: 4, username: "Priya Nair", initials: "PN", color: "#f59e0b", email: "priya@example.com" },
];

function assignee(id) {
  const p = PEOPLE.find((x) => x.id === id);
  return { ...p, profilePicture: null };
}

/**
 * Task rows kept terse: [id, name, status, assigneeIds, project]
 * so the shape of the sprint is readable at a glance.
 */
const SPRINT_23 = [
  ["86ae001", "Sprint planning & backlog grooming", "completed", [1], "Platform"],
  ["86ae002", "Auth service: refresh-token rotation", "in progress", [1, 3], "Platform"],
  ["86ae003", "Migrate reporting jobs to queue workers", "in progress", [3], "Platform"],
  ["86ae004", "Dashboard: sprint overview page", "in review", [2], "Analytics"],
  ["86ae005", "Dashboard: WBS breakdown view", "in progress", [2], "Analytics"],
  ["86ae006", "Status rollup calculations", "completed", [2, 4], "Analytics"],
  ["86ae007", "Customer import: CSV validation", "on hold", [4], "Onboarding"],
  ["86ae008", "Onboarding wizard step 3 copy", "to do", [4], "Onboarding"],
  ["86ae009", "Fix N+1 query on member drill-down", "completed", [3], "Platform"],
  ["86ae010", "Add request-level rate limiting", "to do", [1], "Platform"],
  ["86ae011", "Accessibility pass on task table", "in review", [2], "Analytics"],
  ["86ae012", "Weekly report email template", "blocked", [4], "Onboarding"],
  ["86ae013", "Upgrade Vite to 6.x", "completed", [1], "Platform"],
  ["86ae014", "Instrument API latency metrics", "in progress", [3], "Platform"],
];

const SPRINT_22 = [
  ["86ad001", "Design tokens & global stylesheet", "completed", [2], "Analytics"],
  ["86ad002", "ClickUp REST integration spike", "completed", [1], "Platform"],
  ["86ad003", "Server-side analytics service", "completed", [1, 3], "Platform"],
  ["86ad004", "Status grouping rules", "completed", [3], "Platform"],
  ["86ad005", "Onboarding checklist API", "completed", [4], "Onboarding"],
  ["86ad006", "Retire PPT export script", "completed", [4], "Onboarding"],
  ["86ad007", "Team page member cards", "in review", [2], "Analytics"],
];

const SPRINTS = [
  { id: "901325950934", name: "Sprint 23", rows: SPRINT_23 },
  { id: "901325950821", name: "Sprint 22", rows: SPRINT_22 },
];

/** Deterministic date offsets so output is stable across runs. */
const SPRINT_START = "2026-07-13";

function toTask([id, name, status, assigneeIds, project], index) {
  const done = status === "completed";
  return {
    id,
    customId: `SI-${index + 101}`,
    name,
    status,
    statusColor: null,
    priority: index % 4 === 0 ? "high" : index % 3 === 0 ? "normal" : "low",
    assignees: assigneeIds.map(assignee),
    dueDate: "2026-07-24",
    startDate: SPRINT_START,
    dateCreated: SPRINT_START,
    dateClosed: done ? "2026-07-22" : null,
    project,
    parentTask: null,
    url: `https://app.clickup.com/t/${id}`,
    tags: [],
    locations: [],
  };
}

export function getDemoSprintLists() {
  return SPRINTS.map((s, i) => ({
    id: s.id,
    name: s.name,
    taskCount: s.rows.length,
    ...(i === 0 ? { current: true } : {}),
  }));
}

export function getDemoSprintTasks(listId) {
  const sprint = SPRINTS.find((s) => s.id === listId) || SPRINTS[0];
  return sprint.rows.map(toTask);
}

export function getDemoWorkspaceMembers() {
  return PEOPLE.map((p) => ({ ...p, profilePicture: null, role: "member" }));
}

export function getDemoTaskById(taskId) {
  for (const sprint of SPRINTS) {
    const index = sprint.rows.findIndex((r) => r[0] === taskId);
    if (index !== -1) return toTask(sprint.rows[index], index);
  }
  const err = new Error(`Task not found in demo data: ${taskId}`);
  err.status = 404;
  throw err;
}
