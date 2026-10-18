// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// legal-check — SIT-005 (STD-037): the legal texts have one address,
// numinia.org, and this site links it instead of keeping a copy. This
// scans the repository (never node_modules/dist/.git) for the tell-tale
// signs of a local legal-text copy reappearing and fails the build if it
// finds one: a `content/legal` or `pages/legal` style path, or a Markdown
// file whose frontmatter carries an archive legal-document id (`LEG-0NN`)
// together with `type: legal`. Pure functions are exported for
// test/legal.test.ts.
// Usage: node scripts/legal-check.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Directories never walked: build output, deps, tool caches. */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".coverage", ".astro", ".wrangler"]);

/** A path containing one of these segments is itself a local copy of the legal texts. */
export const FORBIDDEN_PATH_SEGMENTS = ["content/legal", "pages/legal"];

/** Both must match a Markdown file's frontmatter for it to be a copied legal-text master. */
export const FORBIDDEN_CONTENT = [/id:\s*"LEG-0\d\d"/, /type:\s*legal\b/];

function walk(dir) {
	let files = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files = files.concat(walk(full));
		else files.push(full);
	}
	return files;
}

/** Problems found in the repository tree rooted at `base`. Empty = clean. */
export function findLocalCopies(base) {
	const problems = [];
	for (const file of walk(base)) {
		const rel = path.relative(base, file).split(path.sep).join("/");
		if (FORBIDDEN_PATH_SEGMENTS.some((s) => rel.includes(s))) {
			problems.push(`${rel}: path looks like a local copy of the legal texts (SIT-005 — link numinia.org instead)`);
			continue;
		}
		if (!/\.(md|mdx)$/.test(file)) continue;
		const text = fs.readFileSync(file, "utf8");
		if (FORBIDDEN_CONTENT.every((re) => re.test(text))) {
			problems.push(`${rel}: looks like a copied legal-text master (SIT-005 — link numinia.org instead)`);
		}
	}
	return problems;
}

function main() {
	const problems = findLocalCopies(root);
	if (problems.length > 0) {
		for (const p of problems) console.error(`legal-check: ${p}`);
		console.error("legal-check: SIT-005 — the legal texts have one address (numinia.org). Link them, never copy them.");
		process.exit(1);
	}
	console.log("legal-check: no local copy of the legal texts found; this site links numinia.org (SIT-005).");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
