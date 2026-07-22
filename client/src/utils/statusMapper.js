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

export function getEfficiencyConfig(score) {
  if (score === null || score === undefined) {
    return { label: "No Data", color: "var(--text-dim)", bg: "rgba(71,85,105,0.2)" };
  }
  if (score >= 90) return { label: "Excellent", color: "var(--green)", bg: "var(--green-dim)" };
  if (score >= 70) return { label: "Good", color: "var(--accent)", bg: "rgba(34,211,238,0.15)" };
  if (score >= 50) return { label: "Fair", color: "var(--amber)", bg: "var(--amber-dim)" };
  return { label: "Needs Focus", color: "var(--red)", bg: "var(--red-dim)" };
}

export function getVarianceColor(variance) {
  return variance >= 0 ? "var(--green)" : "var(--red)";
}
