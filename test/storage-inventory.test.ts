// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Everything this site keeps in a visitor's browser must be named by the
// cookie policy it publishes (LEG-003 §3.4, the nwos.numen.games section of
// the copied master). A new key the policy does not name fails here: add
// it to the master in the archive first, then re-copy.
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

/** The nwos.numen.games section of the cookie policy, as published. */
function policySection(): string {
	const policy = fs.readFileSync(path.join(root, "src/content/legal/LEG-003-cookie-policy-numengames.md"), "utf8");
	const start = policy.indexOf("### 3.4 nwos.numen.games");
	expect(start).toBeGreaterThan(-1);
	const end = policy.indexOf("\n## ", start);
	return policy.slice(start, end);
}

const namedIn = (section: string, key: string) => section.includes("`" + key + "`");

describe("storage inventory", () => {
	const section = policySection();
	const found = walk(path.join(root, "src")).flatMap((f) => keysIn(fs.readFileSync(f, "utf8")));

	it("the scan sees what the site stores today", () => {
		expect(found).toContain("numinia-modo");
	});

	it("every key stored in the source is named in LEG-003 §3.4", () => {
		const unnamed = [...new Set([...found, CONSENT_COOKIE])].filter((k) => !namedIn(section, k));
		expect(unnamed).toEqual([]);
	});

	it("STORED_KEYS is the policy's list: every stored key, the consent cookie, nothing more", () => {
		for (const k of found) expect(STORED_KEYS).toContain(k);
		expect(STORED_KEYS).toContain(CONSENT_COOKIE);
		for (const k of STORED_KEYS) expect(namedIn(section, k)).toBe(true);
		const policyKeys = [...section.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
		expect([...STORED_KEYS].sort()).toEqual(policyKeys.sort());
	});

	it("a key the policy does not name fails", () => {
		const keys = keysIn('localStorage.setItem("nwos-secret-tracker", "1"); const TRACK_KEY = "t-key";');
		expect(keys).toEqual(["nwos-secret-tracker", "t-key"]);
		expect(keys.filter((k) => !namedIn(section, k))).toEqual(keys);
	});

	it("the consent cookie is the one LEG-003 names, on the policy's major version", () => {
		expect(CONSENT_COOKIE).toBe("numen_consent");
		expect(POLICY_REVISION).toBe(2);
	});
});
