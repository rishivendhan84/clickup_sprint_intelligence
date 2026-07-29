/**
 * ClickUp API service.
 *
 * This is the ONLY module that talks to ClickUp. It replaces the prototype's
 * approach of routing through Anthropic's API + MCP proxy. Direct calls are
 * faster, cheaper, and don't depend on an LLM parsing JSON.
 *
 * Every public function returns clean, normalised objects — never raw API
 * responses — so the rest of the backend is insulated from ClickUp schema
 * changes.
 */

import clickupConfig from "../config/clickupConfig.js";
import { msToDateString } from "../utils/timeUtils.js";

const { baseUrl, headers, workspaceId, sprintFolderId } = clickupConfig;

// ─── Internal helpers ──────────────────────────────────────────────

async function clickupFetch(path, params = {}) {
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(
      `ClickUp API ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`
    );
    err.status = res.status;
    err.hint = explainClickUpError(res.status, path);
    if (err.hint) err.message += `\n   ↳ ${err.hint}`;
    throw err;
  }
  return res.json();
}

/**
 * ClickUp's error bodies are terse ("Team not authorized"). Map the common
 * failures to something actionable, because a silent/obscure failure here is
 * indistinguishable from "the sprint has no tasks".
 */
function explainClickUpError(status, path) {
  if (status === 401) {
    return "Token rejected. Check CLICKUP_API_TOKEN is a Personal API Token (starts with 'pk_') and is passed with no 'Bearer ' prefix.";
  }
  if (status === 404) {
    return `Nothing at ${path}. The ID is probably the wrong *type* — /folder/ needs a Folder ID, /list/ needs a List ID. A Space ID or a Sprint *Folder* ID passed as a list will 404.`;
  }
  if (status === 403) {
    return "Token is valid but the account it belongs to cannot see this Space/Folder/List. Ask an admin to share it with that user.";
  }
  if (status === 429) {
    return "Rate limited (100 req/min per token). Increase CACHE_TTL_SECONDS or slow down polling.";
  }
  return null;
}

/** Sprint lists carry their window as ms-epoch strings; parse defensively. */
function toEpoch(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalise a raw ClickUp task into our internal shape.
 * This is the single source of truth for field mapping.
 */
function normaliseTask(raw) {
  return {
    id: raw.id,
    customId: raw.custom_id || null,
    name: raw.name,
    status: raw.status?.status?.toLowerCase() ?? raw.status ?? "unknown",
    statusColor: raw.status?.color ?? null,
    priority: raw.priority?.priority ?? null,
    assignees: (raw.assignees || []).map((a) => ({
      id: a.id,
      username: a.username,
      initials: a.initials || (a.username ? a.username.charAt(0).toUpperCase() : "?"),
      color: a.color || "#64748b",
      email: a.email || null,
      profilePicture: a.profilePicture || null,
    })),
    timeEstimate: raw.time_estimate || 0,   // ms
    timeSpent: raw.time_spent || 0,         // ms
    dueDate: msToDateString(raw.due_date),
    startDate: msToDateString(raw.start_date),
    dateCreated: msToDateString(raw.date_created),
    dateClosed: msToDateString(raw.date_closed),
    project: raw.list?.name || raw.folder?.name || "Unassigned",
    parentTask: raw.parent ? { id: raw.parent } : null,
    url: raw.url || null,
    tags: (raw.tags || []).map((t) => t.name || t),
    locations: (raw.locations || []).map((l) => ({ id: l.id, name: l.name })),
  };
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * List all sprint lists inside the Sprint Board folder.
 *
 * Returns [{id, name, taskCount, startDate, dueDate, current}] newest-first.
 *
 * Picking `current` matters: the dashboard auto-selects it, so getting it wrong
 * shows an empty dashboard even when the workspace is full of tasks. Sprint
 * folders almost always contain a *next* sprint that has been created but not
 * started and holds zero tasks — so "highest sprint number" is the wrong answer.
 * Preference order:
 *   1. the sprint whose start/due window contains today
 *   2. the newest sprint that actually has tasks
 *   3. the newest sprint by name (last resort)
 */
export async function getSprintLists() {
  if (!sprintFolderId) {
    throw new Error(
      "CLICKUP_SPRINT_FOLDER_ID not configured — set it in .env (see .env.example)"
    );
  }

  const data = await clickupFetch(`/folder/${sprintFolderId}`);
  const raw = data.lists || [];

  if (raw.length === 0) {
    console.warn(
      `⚠  Folder ${sprintFolderId} ("${data.name ?? "?"}") contains no lists. ` +
        "If your sprints live directly in a Space rather than a Folder, " +
        "CLICKUP_SPRINT_FOLDER_ID is pointing at the wrong object."
    );
  }

  const lists = raw.map((l) => ({
    id: l.id,
    name: l.name,
    taskCount: l.task_count === undefined ? null : Number(l.task_count),
    startDate: msToDateString(l.start_date),
    dueDate: msToDateString(l.due_date),
    archived: Boolean(l.archived),
    _start: toEpoch(l.start_date),
    _due: toEpoch(l.due_date),
    current: false,
  }));

  // Sort by name descending (Sprint 21 > Sprint 20 …)
  lists.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  const now = Date.now();
  const inWindow = lists.find(
    (l) => l._start !== null && l._due !== null && l._start <= now && now <= l._due
  );
  const newestWithTasks = lists.find((l) => (l.taskCount ?? 0) > 0);
  const chosen = inWindow || newestWithTasks || lists[0];
  if (chosen) chosen.current = true;

  return lists.map(({ _start, _due, ...l }) => l);
}

/**
 * Fetch every task inside a sprint list, with time data.
 * Handles ClickUp's pagination automatically.
 *
 * @param {string}  listId
 * @param {object} [opts]
 * @param {boolean} [opts.archived]  fetch archived tasks instead of live ones
 */
export async function getSprintTasks(listId, opts = {}) {
  const tasks = await fetchListPages(listId, Boolean(opts.archived));

  // An empty live sprint is usually an archived one. ClickUp hides archived
  // tasks unless you ask for them explicitly, and it does so without any error,
  // which is exactly the "ClickUp returned no tasks" symptom. Check before
  // reporting the list as empty.
  if (tasks.length === 0 && !opts.archived) {
    const archived = await fetchListPages(listId, true);
    if (archived.length > 0) {
      console.warn(
        `⚠  List ${listId} has 0 live tasks but ${archived.length} archived ones — ` +
          "returning the archived tasks. This sprint was archived in ClickUp."
      );
      return archived;
    }
    console.warn(
      `⚠  List ${listId} returned 0 tasks (live and archived). ` +
        "Verify the ID is a List ID (not a Folder/Space ID) and that the token's " +
        "user can see the list. Run `npm run diagnose` in server/ for a full check."
    );
  }

  return tasks;
}

async function fetchListPages(listId, archived) {
  const allTasks = [];

  // ClickUp pages at 100 tasks; 20 pages ≈ 2000 tasks is well past sprint size.
  for (let page = 0; page <= 20; page++) {
    const data = await clickupFetch(`/list/${listId}/task`, {
      page,
      archived,
      subtasks: true,
      include_closed: true,
      order_by: "due_date",
    });

    const tasks = data.tasks || [];
    allTasks.push(...tasks.map(normaliseTask));

    // Stop on ClickUp's own flag, and also on a short/empty page — `last_page`
    // is not always present, and trusting only `!data.last_page` spins through
    // all 20 pages on every request.
    if (data.last_page === true || tasks.length === 0) break;
  }

  return allTasks;
}

/**
 * Metadata for a single list — used by the diagnostics endpoint to tell
 * "wrong ID" apart from "genuinely empty sprint".
 */
export async function getListMeta(listId) {
  const l = await clickupFetch(`/list/${listId}`);
  return {
    id: l.id,
    name: l.name,
    taskCount: l.task_count === undefined ? null : Number(l.task_count),
    archived: Boolean(l.archived),
    startDate: msToDateString(l.start_date),
    dueDate: msToDateString(l.due_date),
    folder: l.folder?.name ?? null,
    space: l.space?.name ?? null,
  };
}

/**
 * Folder metadata — confirms CLICKUP_SPRINT_FOLDER_ID points at a real folder.
 */
export async function getSprintFolderMeta() {
  if (!sprintFolderId) throw new Error("CLICKUP_SPRINT_FOLDER_ID not configured");
  const f = await clickupFetch(`/folder/${sprintFolderId}`);
  return {
    id: f.id,
    name: f.name,
    space: f.space?.name ?? null,
    listCount: (f.lists || []).length,
  };
}

/**
 * Workspaces the token can actually see. If the configured workspace is not in
 * this list, every downstream call will fail or return nothing.
 */
export async function getAuthorizedWorkspaces() {
  const data = await clickupFetch(`/team`);
  return (data.teams || []).map((t) => ({ id: t.id, name: t.name }));
}

/**
 * Fetch detailed time entries for a specific task.
 */
export async function getTaskTimeEntries(taskId) {
  const data = await clickupFetch(`/task/${taskId}/time`);
  return (data.data || []).map((entry) => ({
    id: entry.id,
    description: entry.description || "",
    start: +entry.start,
    end: +entry.end,
    durationMs: +entry.duration,
    user: {
      id: entry.user?.id,
      username: entry.user?.username,
    },
    billable: entry.billable || false,
    tags: (entry.tags || []).map((t) => t.name || t),
  }));
}

/**
 * Fetch all workspace members.
 */
export async function getWorkspaceMembers() {
  const data = await clickupFetch(`/team/${workspaceId}`);
  const team = data.team || data;
  return (team.members || []).map((m) => {
    const u = m.user || m;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      initials: u.initials || (u.username ? u.username.charAt(0).toUpperCase() : "?"),
      color: u.color || "#64748b",
      profilePicture: u.profilePicture || null,
      role: m.role?.name ?? null,
    };
  });
}

/**
 * Fetch a single task by ID (for drill-down views).
 */
export async function getTaskById(taskId) {
  const raw = await clickupFetch(`/task/${taskId}`);
  return normaliseTask(raw);
}
