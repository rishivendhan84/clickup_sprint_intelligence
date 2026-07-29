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

/** Newest-first by name, so "Sprint 21" sorts above "Sprint 20". */
function sortAndMarkCurrent(lists) {
  lists.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  if (lists.length > 0) lists[0].current = true;
  return lists;
}

/**
 * Walk the workspace to find every list the token can see.
 *
 * Used when CLICKUP_SPRINT_FOLDER_ID isn't configured. Finding that ID by hand
 * means digging through ClickUp URLs before the app will start, which is a
 * chicken-and-egg problem on first run — so discover it instead.
 *
 * Lists inside a folder whose name looks sprint-related are preferred; if none
 * match, every list is returned so the dropdown is still usable.
 */
async function discoverSprintLists() {
  const { spaces = [] } = await clickupFetch(`/team/${workspaceId}/space`);

  const all = [];
  for (const space of spaces) {
    const { folders = [] } = await clickupFetch(`/space/${space.id}/folder`);
    for (const folder of folders) {
      for (const l of folder.lists || []) {
        all.push({
          id: l.id,
          name: l.name,
          taskCount: l.task_count ?? null,
          folderId: folder.id,
          folderName: folder.name,
          spaceName: space.name,
        });
      }
    }

    // Lists that live directly in a space, outside any folder
    const { lists = [] } = await clickupFetch(`/space/${space.id}/list`);
    for (const l of lists) {
      all.push({
        id: l.id,
        name: l.name,
        taskCount: l.task_count ?? null,
        folderId: null,
        folderName: null,
        spaceName: space.name,
      });
    }
  }

  const looksLikeSprint = (s) => /sprint|iteration/i.test(s || "");
  const preferred = all.filter(
    (l) => looksLikeSprint(l.folderName) || looksLikeSprint(l.name)
  );

  return sortAndMarkCurrent(preferred.length > 0 ? preferred : all);
}

/**
 * List available sprint lists.
 *
 * Uses CLICKUP_SPRINT_FOLDER_ID when set; otherwise discovers them by walking
 * the workspace, so the app runs with only a token and a workspace ID.
 * Returns [{id, name, current}] sorted newest-first.
 */
export async function getSprintLists() {
  if (demoMode) return getDemoSprintLists();

  if (!sprintFolderId) return discoverSprintLists();

  const data = await clickupFetch(`/folder/${sprintFolderId}`);
  const lists = (data.lists || []).map((l) => ({
    id: l.id,
    name: l.name,
    taskCount: l.task_count ?? null,
  }));

  // A misconfigured folder ID would otherwise present as an empty dropdown with
  // no explanation. Fall back to discovery rather than showing nothing.
  if (lists.length === 0) return discoverSprintLists();

  return sortAndMarkCurrent(lists);
}

/** ClickUp returns at most this many tasks per page. */
const PAGE_SIZE = 100;

/**
 * Fetch every task inside a sprint list.
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

    // Trust last_page when ClickUp sends it. When it's absent, fall back to
    // page fullness: a short page means the end, a full one means there is
    // probably more. Relying on `!data.last_page` alone would either loop to
    // the safety valve or stop after page 0 depending on which way it's wrong.
    if (data.last_page === true || tasks.length === 0) {
      hasMore = false;
    } else {
      hasMore = data.last_page === false || tasks.length >= PAGE_SIZE;
    }
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
