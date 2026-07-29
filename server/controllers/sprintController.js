/**
 * Sprint Controller.
 *
 * Thin layer: validates params → calls service → shapes response.
 * No business logic lives here.
 */

import * as clickup from "../services/clickupService.js";
import { buildSprintAnalytics } from "../services/sprintAnalyticsService.js";
import NodeCache from "node-cache";

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || "300", 10);
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 60 });

// ─── Helper to fetch + cache sprint tasks ──────────────────────────

// An empty result is far more likely to be a transient/config problem than a
// real answer, so it gets a much shorter TTL — otherwise a single bad fetch
// pins the dashboard at "no tasks" for the full 5 minutes even after the
// underlying problem is fixed.
const EMPTY_CACHE_TTL = 15;

async function getCachedSprintTasks(sprintId) {
  const cacheKey = `sprint_tasks_${sprintId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tasks = await clickup.getSprintTasks(sprintId);
  cache.set(cacheKey, tasks, tasks.length === 0 ? EMPTY_CACHE_TTL : CACHE_TTL);
  return tasks;
}

// ─── Route handlers ────────────────────────────────────────────────

/**
 * GET /api/sprints
 * List available sprints from the Sprint Board folder.
 */
export async function listSprints(req, res, next) {
  try {
    const sprints = await clickup.getSprintLists();
    res.json({ sprints });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sprint/:sprintId/summary
 * Full analytics payload: summary + members + WBS + status distribution.
 * This is the primary endpoint that replaces the weekly PPT.
 */
export async function getSprintSummary(req, res, next) {
  try {
    const { sprintId } = req.params;
    if (!sprintId) return res.status(400).json({ error: "sprintId is required" });

    const tasks = await getCachedSprintTasks(sprintId);
    const analytics = buildSprintAnalytics(tasks);

    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sprint/:sprintId/tasks
 * Flat task list with variance data — for the Tasks table view.
 */
export async function getSprintTasks(req, res, next) {
  try {
    const { sprintId } = req.params;
    if (!sprintId) return res.status(400).json({ error: "sprintId is required" });

    const tasks = await getCachedSprintTasks(sprintId);
    const { tasks: enriched } = buildSprintAnalytics(tasks);

    res.json({ tasks: enriched, total: enriched.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sprint/:sprintId/members
 * Per-member performance metrics.
 */
export async function getSprintMembers(req, res, next) {
  try {
    const { sprintId } = req.params;
    if (!sprintId) return res.status(400).json({ error: "sprintId is required" });

    const tasks = await getCachedSprintTasks(sprintId);
    const { members } = buildSprintAnalytics(tasks);

    res.json({ members });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sprint/:sprintId/member/:memberName
 * Deep-dive for one team member.
 */
export async function getMemberDetail(req, res, next) {
  try {
    const { sprintId, memberName } = req.params;
    const tasks = await getCachedSprintTasks(sprintId);

    const memberTasks = tasks.filter((t) =>
      t.assignees.some(
        (a) => a.username.toLowerCase() === decodeURIComponent(memberName).toLowerCase()
      )
    );

    if (memberTasks.length === 0) {
      return res.status(404).json({ error: `No tasks found for member "${memberName}"` });
    }

    const analytics = buildSprintAnalytics(memberTasks);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sprint/:sprintId/wbs
 * Per-project (WBS area) breakdown.
 */
export async function getWBSBreakdown(req, res, next) {
  try {
    const { sprintId } = req.params;
    const tasks = await getCachedSprintTasks(sprintId);
    const { projects } = buildSprintAnalytics(tasks);

    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/diagnostics
 * Walks the whole ClickUp chain — token → workspace → folder → lists → tasks —
 * and reports the first link that breaks. This is the endpoint to hit when the
 * dashboard says "no tasks" and it isn't obvious why.
 */
export async function runDiagnostics(req, res) {
  const checks = [];
  const record = (name, ok, detail, hint) =>
    checks.push({ name, ok, detail, ...(hint && { hint }) });

  let sprints = [];

  try {
    const workspaces = await clickup.getAuthorizedWorkspaces();
    const configured = process.env.CLICKUP_WORKSPACE_ID;
    const match = workspaces.find((w) => String(w.id) === String(configured));
    record(
      "token + workspace",
      Boolean(match),
      match
        ? `Authenticated. Workspace ${configured} = "${match.name}".`
        : `Token works but workspace ${configured} is not among the ones it can see: ${
            workspaces.map((w) => `${w.id} (${w.name})`).join(", ") || "none"
          }.`,
      match ? null : "Set CLICKUP_WORKSPACE_ID to one of the IDs listed above."
    );
  } catch (err) {
    record("token + workspace", false, err.message, err.hint);
    return res.json({ ok: false, checks });
  }

  try {
    const folder = await clickup.getSprintFolderMeta();
    record(
      "sprint folder",
      folder.listCount > 0,
      `Folder ${folder.id} "${folder.name}" in space "${folder.space}" holds ${folder.listCount} list(s).`,
      folder.listCount > 0
        ? null
        : "The folder exists but has no lists. If sprints live directly in a Space, CLICKUP_SPRINT_FOLDER_ID is pointing at the wrong object."
    );
  } catch (err) {
    record("sprint folder", false, err.message, err.hint);
    return res.json({ ok: false, checks });
  }

  try {
    sprints = await clickup.getSprintLists();
    const current = sprints.find((s) => s.current);
    const withTasks = sprints.filter((s) => (s.taskCount ?? 0) > 0);
    record(
      "sprint lists",
      sprints.length > 0,
      `${sprints.length} sprint(s); ${withTasks.length} with a non-zero task_count. ` +
        `Auto-selected: ${current ? `"${current.name}" (${current.id}, task_count=${current.taskCount})` : "none"}.`,
      current && (current.taskCount ?? 0) === 0 && withTasks.length > 0
        ? `The auto-selected sprint is empty while ${withTasks
            .map((s) => `"${s.name}"`)
            .join(", ")} has tasks — pick one of those from the dropdown.`
        : null
    );
  } catch (err) {
    record("sprint lists", false, err.message, err.hint);
    return res.json({ ok: false, checks });
  }

  const target =
    req.query.sprintId || sprints.find((s) => s.current)?.id || sprints[0]?.id;

  if (target) {
    try {
      const meta = await clickup.getListMeta(target);
      const tasks = await clickup.getSprintTasks(target);
      const withEstimates = tasks.filter((t) => t.timeEstimate > 0).length;
      const withTime = tasks.filter((t) => t.timeSpent > 0).length;
      const unassigned = tasks.filter((t) => t.assignees.length === 0).length;

      record(
        "task fetch",
        tasks.length > 0,
        `List ${target} "${meta.name}" (archived=${meta.archived}, ClickUp task_count=${meta.taskCount}) ` +
          `returned ${tasks.length} task(s): ${withEstimates} with a time estimate, ` +
          `${withTime} with tracked time, ${unassigned} unassigned.`,
        tasks.length === 0
          ? "Empty in both live and archived mode. Confirm this List ID has tasks in the ClickUp UI, and that the token's user is a member of the Space."
          : withEstimates === 0
            ? "Tasks came through but none have time estimates — every efficiency metric will read 0/No Data until estimates are set in ClickUp."
            : null
      );
    } catch (err) {
      record("task fetch", false, err.message, err.hint);
    }
  }

  res.json({ ok: checks.every((c) => c.ok), checks });
}

/**
 * POST /api/cache/invalidate
 * Force-clear the cache (used by the "Refresh" button).
 */
export function invalidateCache(req, res) {
  cache.flushAll();
  res.json({ cleared: true, message: "Cache invalidated" });
}
