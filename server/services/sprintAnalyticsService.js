/**
 * Sprint Analytics Service.
 *
 * ALL data processing lives here — the frontend receives pre-computed
 * metrics and never runs its own aggregation. This was the core architectural
 * flaw of the prototype (processData / getStatusDistribution ran in the
 * browser after an LLM extracted JSON).
 */

import { msToHours } from "../utils/timeUtils.js";

// ─── Status mapping ────────────────────────────────────────────────

const STATUS_GROUPS = {
  done: {
    label: "Done",
    color: "#10b981",
    statuses: ["completed", "complete", "closed", "done"],
  },
  review: {
    label: "Review",
    color: "#a78bfa",
    statuses: ["in review", "review", "qa"],
  },
  active: {
    label: "Active",
    color: "#22d3ee",
    statuses: ["in progress", "in development", "dev", "developing"],
  },
  hold: {
    label: "On Hold",
    color: "#f59e0b",
    statuses: ["on hold", "blocked", "waiting"],
  },
  todo: {
    label: "To Do",
    color: "#64748b",
    statuses: ["to do", "open", "new", "backlog", "planned"],
  },
};

function resolveStatusGroup(rawStatus) {
  const lower = (rawStatus || "unknown").toLowerCase();
  for (const [key, group] of Object.entries(STATUS_GROUPS)) {
    if (group.statuses.includes(lower)) return { key, ...group };
  }
  return { key: "other", label: rawStatus || "Other", color: "#475569", statuses: [] };
}

function isDone(status) {
  return STATUS_GROUPS.done.statuses.includes((status || "").toLowerCase());
}

// ─── Efficiency scoring ────────────────────────────────────────────

/**
 * Compute an efficiency score from estimated vs actual time.
 *
 *   score = min(estimated / actual * 100, 100)
 *
 * - 100 means they finished at or under estimate.
 * - 50 means they took twice as long as estimated.
 * - null means insufficient data (no estimate or no tracked time).
 */
function computeEfficiency(estimateMs, spentMs) {
  if (!estimateMs || !spentMs) return null;
  return Math.min(Math.round((estimateMs / spentMs) * 100), 100);
}

function efficiencyLabel(score) {
  if (score === null) return "No Data";
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Focus";
}

// ─── Public analytics functions ────────────────────────────────────

/**
 * Build the full sprint summary from a list of normalised tasks.
 *
 * Returns:
 * {
 *   summary     — top-line metrics
 *   members     — per-person breakdown
 *   projects    — per-WBS/project breakdown
 *   statusDist  — for the pie chart
 *   tasks       — enriched task list with variance data
 * }
 */
export function buildSprintAnalytics(tasks) {
  const memberMap = {};
  const projectMap = {};
  const statusBuckets = {};
  let totalEstimate = 0;
  let totalSpent = 0;
  let completedCount = 0;

  // ── Single pass over all tasks ──────────────────────────────────

  for (const task of tasks) {
    const done = isDone(task.status);
    if (done) completedCount++;

    totalEstimate += task.timeEstimate;
    totalSpent += task.timeSpent;

    // Status distribution
    const group = resolveStatusGroup(task.status);
    if (!statusBuckets[group.key]) {
      statusBuckets[group.key] = { name: group.label, value: 0, color: group.color };
    }
    statusBuckets[group.key].value++;

    // Per-member aggregation
    for (const assignee of task.assignees) {
      const name = assignee.username;
      if (!memberMap[name]) {
        memberMap[name] = {
          id: assignee.id,
          name,
          initials: assignee.initials,
          color: assignee.color,
          email: assignee.email,
          profilePicture: assignee.profilePicture,
          totalEstimate: 0,
          totalSpent: 0,
          completed: 0,
          total: 0,
          tasks: [],
        };
      }
      const m = memberMap[name];
      m.totalEstimate += task.timeEstimate;
      m.totalSpent += task.timeSpent;
      m.total++;
      if (done) m.completed++;
      m.tasks.push(task.id);
    }

    // Per-project (WBS) aggregation
    const projName = task.project;
    if (!projectMap[projName]) {
      projectMap[projName] = {
        name: projName,
        totalEstimate: 0,
        totalSpent: 0,
        completed: 0,
        total: 0,
        tasks: [],
      };
    }
    const p = projectMap[projName];
    p.totalEstimate += task.timeEstimate;
    p.totalSpent += task.timeSpent;
    p.total++;
    if (done) p.completed++;
    p.tasks.push(task.id);
  }

  // ── Derived metrics ─────────────────────────────────────────────

  const members = Object.values(memberMap)
    .map((m) => {
      const efficiency = computeEfficiency(m.totalEstimate, m.totalSpent);
      return {
        ...m,
        totalEstimateHrs: msToHours(m.totalEstimate),
        totalSpentHrs: msToHours(m.totalSpent),
        completionRate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
        efficiency,
        efficiencyLabel: efficiencyLabel(efficiency),
      };
    })
    .sort((a, b) => (b.efficiency ?? -1) - (a.efficiency ?? -1));

  const projects = Object.values(projectMap)
    .map((p) => {
      const efficiency = computeEfficiency(p.totalEstimate, p.totalSpent);
      return {
        ...p,
        totalEstimateHrs: msToHours(p.totalEstimate),
        totalSpentHrs: msToHours(p.totalSpent),
        completionRate: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0,
        efficiency,
        efficiencyLabel: efficiencyLabel(efficiency),
      };
    })
    .sort((a, b) => b.total - a.total);

  const statusDist = Object.values(statusBuckets).sort((a, b) => b.value - a.value);

  // Enrich each task with variance data for the tasks table
  const enrichedTasks = tasks.map((t) => {
    const estHrs = msToHours(t.timeEstimate);
    const actHrs = msToHours(t.timeSpent);
    const variance = +(estHrs - actHrs).toFixed(1);
    const statusGroup = resolveStatusGroup(t.status);
    return {
      ...t,
      estimateHrs: estHrs,
      actualHrs: actHrs,
      variance,
      overBudget: actHrs > estHrs && estHrs > 0,
      statusLabel: statusGroup.label,
      statusColor: statusGroup.color,
    };
  });

  return {
    summary: {
      totalTasks: tasks.length,
      completedTasks: completedCount,
      completionRate: tasks.length > 0
        ? Math.round((completedCount / tasks.length) * 100)
        : 0,
      totalEstimateHrs: msToHours(totalEstimate),
      totalSpentHrs: msToHours(totalSpent),
      overallEfficiency: computeEfficiency(totalEstimate, totalSpent) ?? 0,
      efficiencyLabel: efficiencyLabel(
        computeEfficiency(totalEstimate, totalSpent)
      ),
    },
    members,
    projects,
    statusDist,
    tasks: enrichedTasks,
  };
}

/**
 * Build member detail view — returns a single member's full task breakdown.
 */
export function buildMemberDetail(allTasks, memberName) {
  const memberTasks = allTasks.filter((t) =>
    t.assignees.some((a) => a.username === memberName)
  );
  return buildSprintAnalytics(memberTasks);
}
