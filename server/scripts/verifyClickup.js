#!/usr/bin/env node
/**
 * Connection doctor — `npm run verify` from the repo root.
 *
 * Checks the configured token against the live ClickUp API and prints the
 * workspace and sprint-folder IDs you need for .env. Finding those IDs by
 * hand means digging through ClickUp URLs; this asks the API instead.
 *
 * Exits non-zero if the setup can't serve real data.
 */

import "../config/loadEnv.js";

const BASE = "https://api.clickup.com/api/v2";
const token = process.env.CLICKUP_API_TOKEN;
const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
const folderId = process.env.CLICKUP_SPRINT_FOLDER_ID;

const ok = (m) => console.log(`  ✅  ${m}`);
const bad = (m) => console.log(`  ❌  ${m}`);
const warn = (m) => console.log(`  ⚠️   ${m}`);

/** Mask the token so it never lands in a paste or CI log. */
function mask(t) {
  return t.length <= 12 ? "***" : `${t.slice(0, 8)}…${t.slice(-4)}`;
}

async function call(path) {
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
    err.body = body;
    throw err;
  }
  return body;
}

console.log("\n  ClickUp connection check\n  ─────────────────────────");

if (!token) {
  bad("CLICKUP_API_TOKEN is not set. Copy .env.example → .env at the repo root.");
  process.exit(1);
}
ok(`Token loaded (${mask(token)})`);

// ─── 1. Does the token authenticate? ────────────────────────────────

let me;
try {
  me = (await call("/user")).user;
  ok(`Authenticated as ${me.username} <${me.email}> (id ${me.id})`);
} catch (err) {
  if (/allowlist|proxy|ENOTFOUND|ECONNREFUSED|fetch failed|egress/i.test(err.message)) {
    // Something between here and ClickUp refused the connection. Says nothing
    // about whether the token is valid.
    bad(`Could not reach api.clickup.com — ${err.message}`);
    warn("Network/egress issue, not a credential problem. Check proxy or firewall rules.");
  } else if (err.status === 401) {
    bad("Token rejected (401). Generate a new one at https://app.clickup.com/settings/apps");
  } else if (err.status === 403) {
    bad(`Token authenticated but access was denied (403): ${err.message}`);
    warn("The token may lack permission for this workspace.");
  } else {
    bad(`/user failed: ${err.message}`);
  }
  process.exit(1);
}

// ─── 2. Which workspaces can it see? ────────────────────────────────

const teams = (await call("/team")).teams || [];
if (teams.length === 0) {
  bad("Token can't see any workspaces.");
  process.exit(1);
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

// ─── 3. Find folders that could hold sprint lists ───────────────────

const targetTeam = teams.find((t) => t.id === workspaceId) || teams[0];
console.log(`\n  Folders in "${targetTeam.name}" (candidates for CLICKUP_SPRINT_FOLDER_ID):`);

let found = 0;
const spaces = (await call(`/team/${targetTeam.id}/space`)).spaces || [];
for (const space of spaces) {
  const folders = (await call(`/space/${space.id}/folder`)).folders || [];
  for (const f of folders) {
    const mark = f.id === folderId ? "→" : " ";
    console.log(`  ${mark} ${f.id}  ${space.name} / ${f.name}  (${(f.lists || []).length} lists)`);
    found++;
  }
}

if (found === 0) {
  warn("No folders found. /api/sprints reads sprint lists from a folder —");
  warn("create a folder holding your sprint lists, or run with DEMO_MODE=true.");
} else if (!folderId) {
  warn("CLICKUP_SPRINT_FOLDER_ID is not set — copy one of the IDs above into .env.");
}

// ─── 4. Confirm the configured folder actually resolves ─────────────

if (folderId) {
  try {
    const folder = await call(`/folder/${folderId}`);
    const lists = folder.lists || [];
    ok(`Sprint folder "${folder.name}" resolves with ${lists.length} list(s)`);
    for (const l of lists.slice(0, 10)) {
      console.log(`      ${l.id}  ${l.name}`);
    }
  } catch (err) {
    bad(`CLICKUP_SPRINT_FOLDER_ID=${folderId} did not resolve: ${err.message}`);
    warn("Pick one of the folder IDs listed above.");
    process.exit(1);
  }
}

console.log("\n  Ready — run `npm run dev` and open http://localhost:5173\n");
