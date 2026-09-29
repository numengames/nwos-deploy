// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// legal-check — the four legal pages exist in the built site and show the
// visitor only the text, never the archive's review record.
//
// The copies in src/content/legal/ carry the masters' frontmatter
// (review_flags, restoration notes): it must never be rendered. This runs
// after `astro build` (npm postbuild) over dist/client/legal/<slug>/ and
// fails the build if a page is missing, if any forbidden string reaches
// it, or if it shows an email other than legal@numengames.com.
// Usage: node scripts/legal-check.mjs. Pure functions are exported for
// test/legal.test.ts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The four slugs every Numen Games site publishes. */
export const LEGAL_SLUGS = ["notice", "privacy", "cookies", "terms"];

/** Strings that belong to the archive's record, never to a published page. */
export const FORBIDDEN = ["FLAG-", "frontmatter", "Audience: Oracle", "DRAFT", "[PENDING", "scope is under review", "cuota de socio", "startupvalencia", "gm@numengames.com"];

/** The only address a legal text may show. */
export const LEGAL_EMAIL = "legal@numengames.com";

/** The Markdown body of a copied master: everything after the frontmatter. */
export function bodyOf(markdown) {
	const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(markdown);
	return m ? markdown.slice(m[0].length) : markdown;
}

/** Problems in one published text (Markdown body or built HTML). */
export function legalProblems(text) {
	const problems = FORBIDDEN.filter((s) => text.includes(s)).map((s) => `forbidden string "${s}"`);
	const emails = new Set(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g) ?? []);
	for (const e of emails) if (e !== LEGAL_EMAIL) problems.push(`email other than ${LEGAL_EMAIL}: ${e}`);
	return problems;
}

function main() {
	const dir = path.join(root, "dist", "client", "legal");
	const failures = [];
	for (const slug of LEGAL_SLUGS) {
		const file = path.join(dir, slug, "index.html");
		if (!fs.existsSync(file)) {
			failures.push(`/legal/${slug}: not built (${path.relative(root, file)} missing)`);
			continue;
		}
		for (const p of legalProblems(fs.readFileSync(file, "utf8"))) failures.push(`/legal/${slug}: ${p}`);
	}
	if (failures.length > 0) {
		for (const f of failures) console.error(`legal-check: ${f}`);
		process.exit(1);
	}
	console.log(`legal-check: ${LEGAL_SLUGS.length} legal pages built, none shows the archive's record.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
