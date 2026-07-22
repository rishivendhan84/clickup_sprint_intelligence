/**
 * API client.
 *
 * Single module for all backend communication. The frontend NEVER
 * calls ClickUp directly — everything goes through our Express API.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = "GET", body, retries = 2 } = {}) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts);
      const data = await res.json();

      if (!res.ok) {
        throw new ApiError(data.error || res.statusText, res.status, data);
      }
      return data;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError && err.status < 500) throw err; // don't retry 4xx
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // backoff
      }
    }
  }
  throw lastError;
}

// ─── Public API ────────────────────────────────────────────────────

export function fetchSprints() {
  return request("/sprints");
}

export function fetchSprintSummary(sprintId) {
  return request(`/sprint/${sprintId}/summary`);
}

export function fetchSprintTasks(sprintId) {
  return request(`/sprint/${sprintId}/tasks`);
}

export function fetchSprintMembers(sprintId) {
  return request(`/sprint/${sprintId}/members`);
}

export function fetchMemberDetail(sprintId, memberName) {
  return request(`/sprint/${sprintId}/member/${encodeURIComponent(memberName)}`);
}

export function fetchWBS(sprintId) {
  return request(`/sprint/${sprintId}/wbs`);
}

export function invalidateCache() {
  return request("/cache/invalidate", { method: "POST" });
}

export function healthCheck() {
  return request("/health");
}
