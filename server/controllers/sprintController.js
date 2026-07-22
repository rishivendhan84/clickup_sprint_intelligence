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

async function getCachedSprintTasks(sprintId) {
  const cacheKey = `sprint_tasks_${sprintId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tasks = await clickup.getSprintTasks(sprintId);
  cache.set(cacheKey, tasks);
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
 * POST /api/cache/invalidate
 * Force-clear the cache (used by the "Refresh" button).
 */
export function invalidateCache(req, res) {
  cache.flushAll();
  res.json({ cleared: true, message: "Cache invalidated" });
}
