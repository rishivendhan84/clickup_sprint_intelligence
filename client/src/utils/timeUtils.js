/** Milliseconds → hours (1 decimal) */
export function msToHours(ms) {
  return ms ? +(ms / 3_600_000).toFixed(1) : 0;
}

/** Format hours for display: "6.2h" */
export function formatHours(hrs) {
  return `${hrs}h`;
}
