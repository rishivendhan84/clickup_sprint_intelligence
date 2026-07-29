/**
 * Date helpers.
 *
 * ClickUp returns timestamps as unix-ms strings; we expose plain ISO dates.
 *
 * This file replaces the old timeUtils.js. The ms↔hours and duration-string
 * helpers were removed with the rest of the time-tracking feature — nothing in
 * the status tracker reasons about durations.
 */

/** Unix-ms timestamp → "YYYY-MM-DD" or null */
export function msToDateString(ms) {
  if (!ms) return null;
  return new Date(+ms).toISOString().split("T")[0];
}
