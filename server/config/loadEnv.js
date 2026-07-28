/**
 * Environment loading.
 *
 * The server is started from `server/` (`npm start` → `cd server && node server.js`),
 * but the README tells you to put `.env` at the repo root. Bare `dotenv/config`
 * resolves against process.cwd(), so it would only ever see `server/.env`.
 *
 * This module loads both locations so it works regardless of where you put the
 * file or which directory you launch from. dotenv never overwrites a variable
 * that is already set, so precedence is: real environment > server/.env > root .env.
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, "..");
const repoRoot = join(serverRoot, "..");

config({ path: join(serverRoot, ".env") });
config({ path: join(repoRoot, ".env") });
