/**
 * ClickUp API configuration.
 *
 * All ClickUp-specific constants live here so nothing in the service
 * layer ever reads process.env directly.
 */

import "dotenv/config";

const requiredVars = ["CLICKUP_API_TOKEN", "CLICKUP_WORKSPACE_ID"];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.error(`❌  Missing required env var: ${key}`);
    console.error("   Copy .env.example → .env and fill in your values.");
    process.exit(1);
  }
}

const clickupConfig = {
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
