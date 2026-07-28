/**
 * Sprint Analytics Service.
 *
 * ALL data processing lives here — the frontend receives pre-computed
 * metrics and never runs its own aggregation.
 *
 * Scope note: this module deliberately carries no notion of time. Estimates,
 * logged hours, variance and efficiency scoring were removed — the tool reports
 * *what people are working on and its status*, not how long it took.
 */

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

// ─── Public analytics functions ────────────────────────────────────

/**
 * Build the full sprint summary from a list of normalised tasks.
 *
 * Returns:
 * {
 *   summary     — top-line counts
 *   members     — per-person breakdown
 *   projects    — per-WBS/project breakdown
 *   statusDist  — for the pie chart
 *   tasks       — enriched task list
 * }
 */
export function buildSprintAnalytics(tasks) {
  const memberMap = {};
  const projectMap = {};
  const statusBuckets = {};
  let completedCount = 0;

  // ── Single pass over all tasks ──────────────────────────────────

  for (const task of tasks) {
    const done = isDone(task.status);
    if (done) completedCount++;

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
          completed: 0,
          total: 0,
          tasks: [],
        };
      }
      const m = memberMap[name];
      m.total++;
      if (done) m.completed++;
      m.tasks.push(task.id);
    }

    // Per-project (WBS) aggregation
    const projName = task.project;
    if (!projectMap[projName]) {
      projectMap[projName] = { name: projName, completed: 0, total: 0, tasks: [] };
    }
    const p = projectMap[projName];
    p.total++;
    if (done) p.completed++;
    p.tasks.push(task.id);
  }

  // ── Derived metrics ─────────────────────────────────────────────

  const withCompletionRate = (o) => ({
    ...o,
    completionRate: o.total > 0 ? Math.round((o.completed / o.total) * 100) : 0,
  });

  const members = Object.values(memberMap)
    .map(withCompletionRate)
    .sort((a, b) => b.completionRate - a.completionRate || b.total - a.total);

  const projects = Object.values(projectMap)
    .map(withCompletionRate)
    .sort((a, b) => b.total - a.total);

  const statusDist = Object.values(statusBuckets).sort((a, b) => b.value - a.value);

  const enrichedTasks = tasks.map((t) => {
    const statusGroup = resolveStatusGroup(t.status);
    return {
      ...t,
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
      totalProjects: projects.length,
      totalMembers: members.length,
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
