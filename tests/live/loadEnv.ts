import { existsSync } from "node:fs";

// Load local secrets (never committed) the same way `next dev` would.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
