// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Copy the organisation package from numinia.org into organisation/.
//
// numinia.org (numengames/numinia-archive) is the first organisation that
// runs on NWOS. What it learns — its templates, and the standards and
// procedures any European organisation shares — is what NWOS sells. The
// package lives HERE, duplicated on purpose: a product ships whole. This
// script is the one road between the two, so the copy never drifts by hand:
//
//   node scripts/sync-organisation.mjs [path/to/numinia-archive]
//
// It deletes organisation/{templates,base}/ and copies again, then writes
// organisation/MANIFEST.json: the source commit, every file copied with its
// layer, and every file left behind with the reason. Only CC0-1.0 files
// travel: the package goes to other organisations, and anything reserved or
// attributed stays at home until someone decides otherwise.
//
// Two layers (the third, the organisation's own — brand, culture, products —
// is written by each company, not copied):
//   · templates — the moulds every document is made from;
//   · base      — the standards and procedures that hold for any
//                 organisation, as numinia.org lives them today.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const source = path.resolve(process.argv[2] ?? path.join(repo, "..", "numinia-archive"));
const target = path.join(repo, "organisation");

/** What is Numinia's own and stays home, with the reason. Everything else in
 *  standards/ and procedures/ is base. Edit this list to shape the alpha. */
export const OWN = {
	"standards/STD-003-platform-ranks.md": "Numinia's platform ranks",
	"standards/STD-008-design-tokens.md": "Numinia's design system",
	"standards/STD-023-design-values.md": "Numinia's brand",
	"standards/STD-030-the-worlds-vocabulary.md": "Numinia's world (the narrative layer)",
	"standards/STD-037-what-every-site-carries.md": "Numen Games' websites",
	"standards/STD-047-the-sales-collateral.md": "Numen Games' sales material",
	"procedures/PRO-014-producing-a-design-piece.md": "Numinia's design system",
	"procedures/PRO-022-building-the-living-pieces.md": "Numinia's website pieces",
};

const LAYERS = [
	{ layer: "templates", from: "machine/templates", to: "templates" },
	{ layer: "templates", from: "agents/_template", to: "templates/agent" },
	{ layer: "base", from: "standards", to: "base/standards" },
	{ layer: "base", from: "procedures", to: "base/procedures" },
];

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const p = path.join(dir, name);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
}

/** REUSE.toml annotations of the source: [{ globs, licence }], last wins. */
function reuseAnnotations(text) {
	const out = [];
	for (const block of text.split(/\[\[annotations\]\]/).slice(1)) {
		const paths = block.match(/path\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? block.match(/path\s*=\s*("[^"]*")/)?.[1] ?? "";
		const licence = block.match(/SPDX-License-Identifier\s*=\s*"([^"]+)"/)?.[1];
		const globs = [...paths.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
		if (licence && globs.length) out.push({ globs, licence });
	}
	return out;
}

const globToRe = (g) =>
	new RegExp(
		"^" +
			g
				.split("**")
				.map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
				.join(".*") +
			"$",
	);

/** An SPDX licence line; the tag is split so REUSE does not read this file's. */
export const SPDX_LINE = new RegExp("SPDX-License-" + "Identifier:\\s*([^\\s>]+)");

/** The file's own licence: its SPDX line, else REUSE.toml, else the header. */
export function licenceOf(rel, text, annotations) {
	const spdx = text.match(SPDX_LINE)?.[1];
	if (spdx) return spdx;
	let fromReuse = null;
	for (const a of annotations) if (a.globs.some((g) => globToRe(g).test(rel))) fromReuse = a.licence;
	if (fromReuse) return fromReuse;
	return text.match(/^license:\s*"?([^"\n]+)"?/m)?.[1] ?? null;
}

function main() {
	if (!existsSync(path.join(source, "AGENTS.md"))) {
		console.error(`No numinia-archive at ${source}. Pass its path: node scripts/sync-organisation.mjs <path>`);
		process.exit(1);
	}
	const commit = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	const reuse = existsSync(path.join(source, "REUSE.toml")) ? reuseAnnotations(readFileSync(path.join(source, "REUSE.toml"), "utf8")) : [];

	for (const dir of ["templates", "base"]) rmSync(path.join(target, dir), { recursive: true, force: true });

	const copied = [];
	const left = [];
	for (const { layer, from, to } of LAYERS) {
		for (const abs of walk(path.join(source, from)).sort()) {
			const rel = path.relative(source, abs).split(path.sep).join("/");
			if (OWN[rel]) {
				left.push({ from: rel, reason: OWN[rel] });
				continue;
			}
			const licence = licenceOf(rel, readFileSync(abs, "utf8"), reuse);
			if (licence !== "CC0-1.0") {
				left.push({ from: rel, reason: `licence ${licence ?? "unknown"}: only CC0-1.0 travels` });
				continue;
			}
			const dest = path.join(target, to, path.relative(path.join(source, from), abs));
			mkdirSync(path.dirname(dest), { recursive: true });
			cpSync(abs, dest);
			copied.push({ from: rel, to: path.relative(target, dest).split(path.sep).join("/"), layer });
		}
	}

	const manifest = { source: "https://github.com/numengames/numinia-archive", commit, copied, left };
	writeFileSync(path.join(target, "MANIFEST.json"), JSON.stringify(manifest, null, "\t") + "\n");
	const count = (l) => copied.filter((c) => c.layer === l).length;
	console.log(`organisation/ ← numinia-archive@${commit.slice(0, 7)}: ${count("templates")} templates, ${count("base")} base, ${left.length} left home`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
