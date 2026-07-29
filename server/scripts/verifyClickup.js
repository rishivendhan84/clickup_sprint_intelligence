#!/usr/bin/env node
/**
 * Connection doctor — `npm run verify` from the repo root.
 *
 * Checks the configured token against the live ClickUp API and prints the
 * workspaces, folders and lists it can see. Finding those IDs by hand means
 * digging through ClickUp URLs; this asks the API instead.
 *
 * Sets a non-zero exit code if the setup can't serve real data.
 *
 * Note: this deliberately sets `process.exitCode` and returns rather than
 * calling `process.exit()`. Exiting while a fetch is still settling trips a
 * libuv assertion on Windows (`src\win\async.c`), which buries the actual
 * diagnostic under a crash dump.
 */

import "../config/loadEnv.js";

const BASE = "https://api.clickup.com/api/v2";

const ok = (m) => console.log(`  ✅  ${m}`);
const bad = (m) => console.log(`  ❌  ${m}`);
const warn = (m) => console.log(`  ⚠️   ${m}`);

/** Mask the token so it never lands in a paste or CI log. */
function mask(t) {
  return t.length <= 12 ? "***" : `${t.slice(0, 8)}…${t.slice(-4)}`;
}

/**
 * Catch the most common first-run mistake: copying .env.example to .env and
 * leaving the sample value in place. ClickUp answers that with a bare 401,
 * which reads like a revoked token rather than an unedited file.
 */
function looksLikePlaceholder(t) {
  return /your[_-]?token|your[_-]?key|here$|^pk_xxx|changeme|<.*>/i.test(t);
}

async function call(token, path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: token, "Content-Type": "application/json" },
  });

  // Read as text first: a proxy or gateway sitting in front of ClickUp may
  // answer with a non-JSON body, and that text is the useful diagnostic.
  const raw = await res.text();
  let body = {};
  try {
    body = JSON.parse(raw);
  } catch {
    /* non-JSON — keep raw for the error message */
  }

  if (!res.ok) {
    const detail = body.err || body.error || raw.slice(0, 200) || res.statusText;
    const err = new Error(`${res.status} ${detail}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function main() {
  const token = process.env.CLICKUP_API_TOKEN;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  const folderId = process.env.CLICKUP_SPRINT_FOLDER_ID;

  console.log("\n  ClickUp connection check\n  ─────────────────────────");

  // ─── 0. Is a real token configured? ──────────────────────────────

  if (!token) {
    bad("CLICKUP_API_TOKEN is not set. Copy .env.example → .env at the repo root.");
    return 1;
  }

  if (looksLikePlaceholder(token)) {
    bad(`CLICKUP_API_TOKEN is still the example value (${mask(token)}).`);
    warn("You copied .env.example but didn't paste your real token over it.");
    console.log("      Get one at https://app.clickup.com/settings/apps → Personal API Token,");
    console.log("      then replace the CLICKUP_API_TOKEN line in .env.");
    return 1;
  }

  if (!token.startsWith("pk_")) {
    warn(`Token doesn't start with "pk_" — ClickUp personal tokens normally do.`);
  }

  ok(`Token loaded (${mask(token)})`);

  // ─── 1. Does the token authenticate? ─────────────────────────────

  let me;
  try {
    me = (await call(token, "/user")).user;
    ok(`Authenticated as ${me.username} <${me.email}> (id ${me.id})`);
  } catch (err) {
    if (/allowlist|proxy|ENOTFOUND|ECONNREFUSED|fetch failed|egress/i.test(err.message)) {
      // Something between here and ClickUp refused the connection. Says nothing
      // about whether the token is valid.
      bad(`Could not reach api.clickup.com — ${err.message}`);
      warn("Network/egress issue, not a credential problem. Check proxy or firewall rules.");
    } else if (err.status === 401) {
      bad("Token rejected (401) — it is wrong, revoked, or from another account.");
      warn("Generate a fresh one at https://app.clickup.com/settings/apps");
    } else if (err.status === 403) {
      bad(`Token authenticated but access was denied (403): ${err.message}`);
      warn("The token may lack permission for this workspace.");
    } else {
      bad(`/user failed: ${err.message}`);
    }
    return 1;
  }

  // ─── 2. Which workspaces can it see? ─────────────────────────────

  const teams = (await call(token, "/team")).teams || [];
  if (teams.length === 0) {
    bad("Token can't see any workspaces.");
    return 1;
  }

  console.log("\n  Workspaces visible to this token:");
  for (const t of teams) {
    const mark = t.id === workspaceId ? "→" : " ";
    console.log(`  ${mark} ${t.id}  ${t.name}  (${(t.members || []).length} members)`);
  }

  if (!workspaceId) {
    warn("CLICKUP_WORKSPACE_ID is not set — copy one of the IDs above into .env.");
  } else if (!teams.some((t) => t.id === workspaceId)) {
    bad(`CLICKUP_WORKSPACE_ID=${workspaceId} is not in that list. Use one of the IDs above.`);
  } else {
    ok(`CLICKUP_WORKSPACE_ID=${workspaceId} matches`);
  }

  // ─── 3. Folders and lists ────────────────────────────────────────

  const targetTeam = teams.find((t) => t.id === workspaceId) || teams[0];
  console.log(`\n  Folders in "${targetTeam.name}":`);

  const spaces = (await call(token, `/team/${targetTeam.id}/space`)).spaces || [];
  let folderCount = 0;
  const lists = [];

  for (const space of spaces) {
    const folders = (await call(token, `/space/${space.id}/folder`)).folders || [];
    for (const f of folders) {
      const mark = f.id === folderId ? "→" : " ";
      console.log(`  ${mark} ${f.id}  ${space.name} / ${f.name}  (${(f.lists || []).length} lists)`);
      folderCount++;
      for (const l of f.lists || []) {
        lists.push({ ...l, where: `${space.name} / ${f.name}` });
      }
    }

    const loose = (await call(token, `/space/${space.id}/list`)).lists || [];
    for (const l of loose) {
      lists.push({ ...l, where: `${space.name} / (no folder)` });
    }
  }

  if (folderCount === 0) warn("No folders found in this workspace.");
  else if (!folderId) {
    ok("CLICKUP_SPRINT_FOLDER_ID not set — the app will auto-discover sprint lists.");
    console.log("      Set it to one of the IDs above to pin a specific folder.");
  }

  console.log("\n  Lists the sprint dropdown would offer:");
  if (lists.length === 0) {
    bad("None. This workspace has no lists, so there are no tasks to report on.");
    warn("Create lists with tasks in ClickUp, or run with DEMO_MODE=true.");
    return 1;
  }
  for (const l of lists) {
    console.log(`    ${l.id}  ${l.where} / ${l.name}  — ${l.task_count ?? "?"} tasks`);
  }
  ok(`${lists.length} list(s) available`);

  const withTasks = lists.filter((l) => (l.task_count ?? 0) > 0).length;
  if (withTasks === 0) {
    warn("Every list is empty — the dashboard will load but show nothing.");
  }

  console.log("\n  Ready — run `npm run dev` and open http://localhost:5173\n");
  return 0;
}

process.exitCode = await main().catch((err) => {
  bad(`Unexpected failure: ${err.message}`);
  return 1;
});
