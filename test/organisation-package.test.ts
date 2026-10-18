// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The organisation package (organisation/) is a copy of numinia.org made by
// scripts/sync-organisation.mjs. These tests hold the copy honest: the
// manifest and the folder say the same thing, nothing reserved travels, and
// what was declared Numinia's own never reaches a client.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OWN, SPDX_LINE, licenceOf } from "../scripts/sync-organisation.mjs";

const root = path.resolve(__dirname, "../organisation");
const manifest = JSON.parse(readFileSync(path.join(root, "MANIFEST.json"), "utf8")) as {
	commit: string;
	copied: { from: string; to: string; layer: string }[];
	left: { from: string; reason: string }[];
};

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((n) => {
		const p = path.join(dir, n);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
}

const onDisk = ["templates", "base"].flatMap((d) => walk(path.join(root, d)).map((p) => path.relative(root, p).split(path.sep).join("/")));

describe("organisation/ — the package copied from numinia.org", () => {
	it("names the numinia.org commit it came from", () => {
		expect(manifest.commit).toMatch(/^[0-9a-f]{40}$/);
	});

	it("the manifest and the folder list the same files, none edited by hand into existence", () => {
		expect([...onDisk].sort()).toEqual(manifest.copied.map((c) => c.to).sort());
	});

	it("carries both layers: templates and the shared base", () => {
		const layers = new Set(manifest.copied.map((c) => c.layer));
		expect(layers).toEqual(new Set(["templates", "base"]));
		expect(existsSync(path.join(root, "base/procedures/PRO-025-handling-a-personal-data-breach.md"))).toBe(true);
		expect(existsSync(path.join(root, "templates/PRO-TEMPLATE.md"))).toBe(true);
	});

	it("nothing that is Numinia's own travels", () => {
		const copiedFrom = new Set(manifest.copied.map((c) => c.from));
		for (const own of Object.keys(OWN)) expect(copiedFrom.has(own)).toBe(false);
	});

	it("nothing reserved travels: every SPDX line says CC0-1.0, every base header too", () => {
		for (const rel of onDisk) {
			const text = readFileSync(path.join(root, rel), "utf8");
			for (const m of text.matchAll(new RegExp(SPDX_LINE, "g"))) expect(m[1], rel).toBe("CC0-1.0");
			// Templates without an SPDX line take CC0 from numinia-archive's
			// REUSE.toml; their `license:` header is the placeholder the mould
			// prescribes for what is made from it, not the file's own.
			if (rel.startsWith("base/")) expect(licenceOf(rel, text, []), rel).toBe("CC0-1.0");
		}
	});
});
