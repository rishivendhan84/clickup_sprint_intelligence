/**
 * Status display configuration.
 *
 * The backend already resolves statuses into labels, but we keep a
 * client-side map for colour-coding cells and badges without an
 * extra round-trip.
 */

const STATUS_CONFIG = {
  Done:     { color: "var(--green)" },
  Review:   { color: "var(--purple)" },
  Active:   { color: "var(--accent)" },
  Dev:      { color: "var(--blue)" },
  "On Hold":{ color: "var(--amber)" },
  "To Do":  { color: "var(--text-muted)" },
  New:      { color: "var(--text-dim)" },
};

export function getStatusColor(label) {
  return STATUS_CONFIG[label]?.color ?? "var(--text-muted)";
}

/** Colour for a completion percentage — used by rings, chips and metric cards. */
export function getCompletionColor(rate) {
  if (rate >= 75) return "var(--green)";
  if (rate >= 40) return "var(--amber)";
  return "var(--red)";
}
