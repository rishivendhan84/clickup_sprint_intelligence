/**
 * ClickUp connectivity diagnostic.
 *
 *   cd server && npm run diagnose
 *   cd server && npm run diagnose -- 901325950934      # check a specific list
 *
 * Walks the same chain the dashboard walks — token → workspace → sprint folder
 * → sprint lists → tasks — and stops at the first broken link, with the reason.
 * Use this when the dashboard shows "no tasks" and it isn't obvious why.
 */

import "dotenv/config";

const RESET = "\x1b[0m";
const c = {
  ok: (s) => `\x1b[32m${s}${RESET}`,
  bad: (s) => `\x1b[31m${s}${RESET}`,
  warn: (s) => `\x1b[33m${s}${RESET}`,
  dim: (s) => `\x1b[2m${s}${RESET}`,
  bold: (s) => `\x1b[1m${s}${RESET}`,
};

const pass = (msg) => console.log(`  ${c.ok("✔")} ${msg}`);
const fail = (msg) => console.log(`  ${c.bad("✘")} ${msg}`);
const warn = (msg) => console.log(`  ${c.warn("!")} ${msg}`);
const hint = (msg) => console.log(`    ${c.dim("↳ " + msg)}`);

// ─── Step 0: env ───────────────────────────────────────────────────

console.log(`\n${c.bold("ClickUp diagnostic")}\n`);
console.log(c.bold("1. Environment"));

const token = process.env.CLICKUP_API_TOKEN;
const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
const folderId = process.env.CLICKUP_SPRINT_FOLDER_ID;

let fatal = false;
if (!token) {
  fail("CLICKUP_API_TOKEN is not set");
  hint("Copy .env.example → .env and paste a Personal API Token from https://app.clickup.com/settings/apps");
  fatal = true;
} else {
  pass(`CLICKUP_API_TOKEN set (${token.slice(0, 5)}…${token.slice(-4)}, ${token.length} chars)`);
  if (!token.startsWith("pk_")) {
    warn("Token does not start with 'pk_' — that is the Personal API Token prefix");
    hint("An OAuth access token works too, but a workspace/app *client secret* will not.");
  }
  if (/^Bearer\s/i.test(token)) {
    fail("Token includes a 'Bearer ' prefix — ClickUp v2 wants the raw token");
    fatal = true;
  }
}

if (!workspaceId) {
  fail("CLICKUP_WORKSPACE_ID is not set");
  fatal = true;
} else {
  pass(`CLICKUP_WORKSPACE_ID = ${workspaceId}`);
}

if (!folderId) {
  fail("CLICKUP_SPRINT_FOLDER_ID is not set — /api/sprints cannot list any sprints");
  hint("Open your Sprint Folder in ClickUp; the folder ID is the long number in the URL.");
  fatal = true;
} else {
  pass(`CLICKUP_SPRINT_FOLDER_ID = ${folderId}`);
}

if (fatal) {
  console.log(`\n${c.bad("Stopped: fix the environment above first.")}\n`);
  process.exit(1);
}

const BASE = "https://api.clickup.com/api/v2";
const headers = { Authorization: token, "Content-Type": "application/json" };

async function call(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

// ─── Step 1: token + workspace ─────────────────────────────────────

console.log(`\n${c.bold("2. Token and workspace")}`);

const teams = await call("/team");
if (!teams.ok) {
  fail(`GET /team → ${teams.status}: ${teams.text.slice(0, 160)}`);
  if (teams.status === 401) hint("The token is invalid, revoked, or belongs to a different ClickUp account.");
  process.exit(1);
}
const workspaces = teams.json?.teams || [];
pass(`Token authenticates. Visible workspaces: ${workspaces.map((t) => `${t.id} (${t.name})`).join(", ") || "none"}`);

const activeWorkspace = workspaces.find((t) => String(t.id) === String(workspaceId));
if (!activeWorkspace) {
  fail(`CLICKUP_WORKSPACE_ID ${workspaceId} is NOT one of the workspaces this token can see`);
  hint("Set it to one of the IDs above. A token only ever sees the workspaces its user belongs to.");
  process.exit(1);
}
pass(`Workspace ${workspaceId} = "${activeWorkspace.name}"`);

const members = (
  await call(`/team/${workspaceId}`)
).json?.team?.members ?? [];
pass(`${members.length} workspace member(s) visible`);

// ─── Step 2: sprint folder ─────────────────────────────────────────

console.log(`\n${c.bold("3. Sprint folder")}`);

const folder = await call(`/folder/${folderId}`);
if (!folder.ok) {
  fail(`GET /folder/${folderId} → ${folder.status}: ${folder.text.slice(0, 160)}`);
  if (folder.status === 404) {
    hint("This ID is not a Folder. Sprint *Spaces* and *Lists* have IDs that look identical but live at different endpoints.");
    hint("In ClickUp, click the Sprint Folder in the sidebar — the URL segment after /v/f/ (or the folder settings) is the folder ID.");
  }
  if (folder.status === 401 || folder.status === 403) {
    hint("The folder exists but this token's user is not a member of its Space. Share the Space with that user.");
  }
  process.exit(1);
}

const lists = folder.json?.lists || [];
pass(`Folder "${folder.json?.name}" in space "${folder.json?.space?.name}" — ${lists.length} list(s)`);

if (lists.length === 0) {
  fail("The folder has no lists, so the sprint dropdown will be empty and no tasks can load");
  hint("If your sprints are folderless lists inside a Space, this project needs a Space ID and a /space/{id}/list call instead.");
  process.exit(1);
}

// ─── Step 3: which sprint gets auto-selected ───────────────────────

console.log(`\n${c.bold("4. Sprints and task counts")}`);

const now = Date.now();
const rows = lists
  .map((l) => ({
    id: l.id,
    name: l.name,
    count: l.task_count === undefined ? null : Number(l.task_count),
    start: l.start_date ? Number(l.start_date) : null,
    due: l.due_date ? Number(l.due_date) : null,
    archived: Boolean(l.archived),
  }))
  .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

for (const r of rows) {
  const window =
    r.start && r.due
      ? `${new Date(r.start).toISOString().slice(0, 10)} → ${new Date(r.due).toISOString().slice(0, 10)}`
      : "no dates";
  const live = r.start && r.due && r.start <= now && now <= r.due ? c.ok(" ← today") : "";
  const label = `${r.name} (${r.id})  task_count=${r.count ?? "?"}  ${window}${r.archived ? "  [archived]" : ""}${live}`;
  (r.count ?? 0) > 0 ? pass(label) : warn(label);
}

const inWindow = rows.find((r) => r.start && r.due && r.start <= now && now <= r.due);
const newestWithTasks = rows.find((r) => (r.count ?? 0) > 0);
const byName = rows[0];

console.log("");
console.log(`  ${c.dim("newest by name:")}      ${byName.name} (task_count=${byName.count ?? "?"})`);
console.log(`  ${c.dim("today's window:")}      ${inWindow ? inWindow.name : "none"}`);
console.log(`  ${c.dim("newest with tasks:")}   ${newestWithTasks ? newestWithTasks.name : "none"}`);

if ((byName.count ?? 0) === 0 && newestWithTasks) {
  console.log("");
  warn(
    `The newest sprint by name ("${byName.name}") is EMPTY. The original code auto-selected exactly this list, ` +
      `which is why the dashboard showed no tasks while "${newestWithTasks.name}" has ${newestWithTasks.count}.`
  );
}

// ─── Step 4: actually fetch tasks ──────────────────────────────────

const targetId = process.argv[2] || (inWindow || newestWithTasks || byName).id;
const targetName = rows.find((r) => r.id === targetId)?.name ?? targetId;

console.log(`\n${c.bold(`5. Task fetch — "${targetName}" (${targetId})`)}`);

async function fetchAll(archived) {
  const out = [];
  for (let page = 0; page <= 20; page++) {
    const r = await call(`/list/${targetId}/task`, {
      page,
      archived,
      subtasks: true,
      include_closed: true,
      order_by: "due_date",
    });
    if (!r.ok) {
      fail(`GET /list/${targetId}/task → ${r.status}: ${r.text.slice(0, 160)}`);
      if (r.status === 404) hint("This is not a List ID. Folder and Space IDs 404 on /list/{id}/task.");
      return null;
    }
    const tasks = r.json?.tasks || [];
    out.push(...tasks);
    if (r.json?.last_page === true || tasks.length === 0) break;
  }
  return out;
}

const live = await fetchAll(false);
if (live === null) process.exit(1);

if (live.length > 0) {
  pass(`${live.length} live task(s) returned`);
} else {
  warn("0 live tasks");
  const archived = await fetchAll(true);
  if (archived && archived.length > 0) {
    warn(`${archived.length} ARCHIVED task(s) found — this sprint was archived in ClickUp`);
    hint("ClickUp silently omits archived tasks unless archived=true. This is the single most common cause of a 'no tasks' result.");
  } else {
    fail("0 tasks live and 0 archived — the list really is empty for this token");
    hint("Open the list in ClickUp as the token's user. If you can see tasks there but not here, the token belongs to a different account.");
  }
}

const sample = live.length ? live : [];
if (sample.length) {
  const withEstimate = sample.filter((t) => t.time_estimate).length;
  const withTime = sample.filter((t) => t.time_spent).length;
  const unassigned = sample.filter((t) => (t.assignees || []).length === 0).length;
  const statuses = [...new Set(sample.map((t) => t.status?.status?.toLowerCase()))];

  console.log("");
  (withEstimate > 0 ? pass : warn)(`${withEstimate}/${sample.length} tasks have a time estimate`);
  (withTime > 0 ? pass : warn)(`${withTime}/${sample.length} tasks have tracked time`);
  (unassigned === 0 ? pass : warn)(`${unassigned}/${sample.length} tasks are unassigned (they vanish from the Team tab)`);
  console.log(`  ${c.dim("statuses seen:")} ${statuses.join(", ")}`);

  const known = [
    "completed", "complete", "closed", "done",
    "in review", "review", "qa",
    "in progress", "in development", "dev", "developing",
    "on hold", "blocked", "waiting",
    "to do", "open", "new", "backlog", "planned",
  ];
  const unmapped = statuses.filter((s) => s && !known.includes(s));
  if (unmapped.length) {
    warn(`Unmapped statuses: ${unmapped.join(", ")}`);
    hint("Add them to STATUS_GROUPS in server/services/sprintAnalyticsService.js or they land in a generic 'Other' bucket and never count as done.");
  }
}

console.log(`\n${c.bold("Done.")}\n`);
