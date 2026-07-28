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
import { msToDateString } from "../utils/dateUtils.js";
import {
  getDemoSprintLists,
  getDemoSprintTasks,
  getDemoWorkspaceMembers,
  getDemoTaskById,
} from "./demoData.js";

const { baseUrl, headers, workspaceId, sprintFolderId, demoMode } = clickupConfig;

// ─── Internal helpers ──────────────────────────────────────────────

async function clickupFetch(path, params = {}) {
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `ClickUp API ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`
    );
  }
  return res.json();
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
 * Returns [{id, name, current}] sorted newest-first.
 */
export async function getSprintLists() {
  if (demoMode) return getDemoSprintLists();

  if (!sprintFolderId) {
    throw new Error("CLICKUP_SPRINT_FOLDER_ID not configured");
  }

  const data = await clickupFetch(`/folder/${sprintFolderId}`);
  const lists = (data.lists || []).map((l) => ({
    id: l.id,
    name: l.name,
    taskCount: l.task_count ?? null,
  }));

  // Sort by name descending (Sprint 21 > Sprint 20 …)
  lists.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  // Mark the first one (highest number) as current
  if (lists.length > 0) lists[0].current = true;

  return lists;
}

/**
 * Fetch every task inside a sprint list, with time data.
 * Handles ClickUp's pagination automatically.
 */
export async function getSprintTasks(listId) {
  if (demoMode) return getDemoSprintTasks(listId);

  const allTasks = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const data = await clickupFetch(`/list/${listId}/task`, {
      page,
      subtasks: true,
      include_closed: true,
      order_by: "due_date",
    });

    const tasks = data.tasks || [];
    allTasks.push(...tasks.map(normaliseTask));

    // Stop on an explicit last_page flag, or on an empty page — older ClickUp
    // responses omit last_page, and `!undefined` would loop to the safety valve.
    hasMore = data.last_page === false && tasks.length > 0;
    page++;

    // Safety valve — ClickUp has a practical limit
    if (page > 20) break;
  }

  return allTasks;
}


/**
 * Fetch all workspace members.
 */
export async function getWorkspaceMembers() {
  if (demoMode) return getDemoWorkspaceMembers();

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
  if (demoMode) return getDemoTaskById(taskId);

  const raw = await clickupFetch(`/task/${taskId}`);
  return normaliseTask(raw);
}
