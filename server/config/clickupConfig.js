/**
 * ClickUp API configuration.
 *
 * All ClickUp-specific constants live here so nothing in the service
 * layer ever reads process.env directly.
 */

import "./loadEnv.js";

const demoMode = /^(1|true|yes)$/i.test(process.env.DEMO_MODE || "");

const requiredVars = ["CLICKUP_API_TOKEN", "CLICKUP_WORKSPACE_ID"];
const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length > 0 && !demoMode) {
  console.error(`❌  Missing required env var(s): ${missing.join(", ")}`);
  console.error("   Copy .env.example → .env and fill in your values,");
  console.error("   or set DEMO_MODE=true to run against bundled sample data.");
  process.exit(1);
}

if (demoMode) {
  console.log("⚠️   DEMO_MODE on — serving bundled sample data, not live ClickUp.");
}

const clickupConfig = {
  demoMode,
  apiToken: process.env.CLICKUP_API_TOKEN,
  workspaceId: process.env.CLICKUP_WORKSPACE_ID,
  sprintFolderId: process.env.CLICKUP_SPRINT_FOLDER_ID || "",
  baseUrl: "https://api.clickup.com/api/v2",

  /** Default headers for every ClickUp request */
  get headers() {
    return {
      Authorization: this.apiToken,
      "Content-Type": "application/json",
    };
  },
};

export default clickupConfig;
