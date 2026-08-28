/**
 * Copy the pre-built SDK IIFE bundle into the web app's public directory
 * so it can be served as a static asset during development and production.
 *
 * Usage: bun apps/web/scripts/copy-sdk.ts
 */

import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const WEB_ROOT = join(import.meta.dir, "..");
const SDK_DIST = join(WEB_ROOT, "../../packages/sdk/dist");
const PUBLIC_DIR = join(WEB_ROOT, "public");

const sourceFile = join(SDK_DIST, "filika.js");
const destFile = join(PUBLIC_DIR, "filika.js");

if (!existsSync(sourceFile)) {
  console.error(
    `SDK bundle not found at ${sourceFile}.\nRun 'bun run --filter @filika/sdk build' first.`,
  );
  process.exit(1);
}

if (!existsSync(PUBLIC_DIR)) {
  mkdirSync(PUBLIC_DIR, { recursive: true });
}

copyFileSync(sourceFile, destFile);
console.log(`Copied SDK bundle → ${destFile}`);
