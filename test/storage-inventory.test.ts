// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Everything this site keeps in a visitor's browser must be named by the
// cookie policy it publishes (LEG-003 §3.4, the nwos.numen.games section).
// SIT-005 (STD-037) forbids keeping a local copy of that text (see
// src/data/legal.ts, scripts/legal-check.mjs), so this test checks the
// keys the source actually stores against STORED_KEYS, the list this
// repo keeps in sync by hand with the published policy at
// https://numinia.org/legal/cookies §3.4. A new key fails here: add it to
// the master in the archive first, then update STORED_KEYS here.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONSENT_COOKIE, POLICY_REVISION, STORED_KEYS } from "../src/lib/cookie-notice";

const root = path.resolve(__dirname, "..");

function walk(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) return walk(p);
		return /\.(ts|tsx|astro|js|mjs)$/.test(e.name) ? [p] : [];
	});
}

/** Keys the source stores: setItem literals, cookie writes, *KEY* constants. */
export function keysIn(src: string): string[] {
	const keys = new Set<string>();
	for (const m of src.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*["'`]([^"'`]+)["'`]/g)) keys.add(m[1]!);
	for (const m of src.matchAll(/document\.cookie\s*=\s*["'`]([^=;"'`]+)=/g)) keys.add(m[1]!);
	for (const m of src.matchAll(/const\s+\w*KEY\w*\s*(?::\s*[\w<>[\]]+\s*)?=\s*["'`]([^"'`]+)["'`]/g)) keys.add(m[1]!);
	return [...keys];
}

const namedIn = (key: string) => (STORED_KEYS as readonly string[]).includes(key);

describe("storage inventory", () => {
	const found = walk(path.join(root, "src")).flatMap((f) => keysIn(fs.readFileSync(f, "utf8")));

	it("the scan sees what the site stores today", () => {
		expect(found).toContain("numinia-modo");
	});

	it("every key stored in the source is named in STORED_KEYS (kept in sync with LEG-003 §3.4 by hand)", () => {
		const unnamed = [...new Set([...found, CONSENT_COOKIE])].filter((k) => !namedIn(k));
		expect(unnamed).toEqual([]);
	});

	it("STORED_KEYS is exactly what the source stores, plus the consent cookie, nothing more", () => {
		for (const k of found) expect(STORED_KEYS).toContain(k);
		expect(STORED_KEYS).toContain(CONSENT_COOKIE);
		expect([...new Set([...found, CONSENT_COOKIE])].sort()).toEqual([...STORED_KEYS].sort());
	});

	it("a key not in STORED_KEYS fails the hygiene check", () => {
		const keys = keysIn('localStorage.setItem("nwos-secret-tracker", "1"); const TRACK_KEY = "t-key";');
		expect(keys).toEqual(["nwos-secret-tracker", "t-key"]);
		expect(keys.filter((k) => !namedIn(k))).toEqual(keys);
	});

	it("the consent cookie is the one LEG-003 names, on the policy's major version", () => {
		expect(CONSENT_COOKIE).toBe("numen_consent");
		expect(POLICY_REVISION).toBe(2);
	});
});
