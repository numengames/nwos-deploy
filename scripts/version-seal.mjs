// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// version-seal — writes dist/client/version.json so a deploy can be
// checked against `main` from outside, same contract as the other three
// Numen Games sites (numinia.com, numen.games, numinia.org):
//   { commit: <full sha or "dev">, version: <CURRENT_VERSION>, builtAt: <ISO> }
//
// The commit comes from WORKERS_CI_COMMIT_SHA, which Cloudflare Workers
// Builds injects (see src/lib/build-info.ts — the footer reads the same
// variable, 7-char slice). The version is the newest entry of
// src/data/updates.ts, read with the same regex check-version-bump.mjs
// already uses, so this script needs no TypeScript loader.
//
// Usage: node scripts/version-seal.mjs (npm runs it as part of postbuild,
// after license-check and legal-check so a failed build never gets sealed).
// The pure functions are exported for the tests (vitest).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist", "client");
const updatesPath = path.join(root, "src", "data", "updates.ts");

/** Extracts the newest `version: "vX.Y.Z"` entry from updates.ts source. */
export function currentVersionFrom(updatesSource) {
	const match = /version:\s*"(v\d+\.\d+\.\d+)"/.exec(updatesSource);
	return match ? match[1] : null;
}

/** Builds the JSON body written to version.json. */
export function sealBody(commitSha, version, builtAt) {
	return { commit: commitSha || "dev", version, builtAt };
}

function main() {
	if (!fs.existsSync(outDir)) {
		console.error(`version-seal: ${outDir} does not exist — run \`npm run build\` first.`);
		process.exit(1);
	}

	const version = currentVersionFrom(fs.readFileSync(updatesPath, "utf-8"));
	if (!version) {
		console.error(`version-seal: no version entry found in ${updatesPath}`);
		process.exit(1);
	}

	const body = sealBody(process.env.WORKERS_CI_COMMIT_SHA, version, new Date().toISOString());
	fs.writeFileSync(path.join(outDir, "version.json"), JSON.stringify(body) + "\n");
	console.log(`version-seal: sealed ${body.commit === "dev" ? "dev" : body.commit.slice(0, 7)} (${body.version}) → dist/client/version.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
