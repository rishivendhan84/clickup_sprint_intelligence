/**
 * Time conversion helpers.
 * ClickUp stores durations in milliseconds; we expose hours for display.
 */

/** Milliseconds → hours, rounded to 1 decimal */
export function msToHours(ms) {
  return ms ? +(ms / 3_600_000).toFixed(1) : 0;
}

/** Hours → milliseconds */
export function hoursToMs(h) {
  return Math.round(h * 3_600_000);
}

/**
 * Parse a ClickUp duration string ("2h 47m") into milliseconds.
 * Returns 0 for unparseable input.
 */
export function parseDurationString(str) {
  if (!str) return 0;
  const hours = str.match(/(\d+)\s*h/)?.[1] ?? 0;
  const mins = str.match(/(\d+)\s*m/)?.[1] ?? 0;
  return (+hours * 3_600_000) + (+mins * 60_000);
}

/** Unix-ms timestamp → "YYYY-MM-DD" or null */
export function msToDateString(ms) {
  if (!ms) return null;
  return new Date(+ms).toISOString().split("T")[0];
}
