// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The legal texts are the archive's masters, copied word for word, and a
// visitor sees only their body: never the review record, never a stray
// address. Refreshing a copy = copy the master again and update PINS.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_PAGES, legalHref } from "../src/data/legal";
import { bodyOf, FORBIDDEN, LEGAL_EMAIL, LEGAL_SLUGS, legalProblems } from "../scripts/legal-check.mjs";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// The masters in numengames/numinia-archive legal/ (branch
// legal/honest-texts-and-debt, PR #572): id, version, sha256 of the file.
const PINS: Record<string, { version: string; sha256: string }> = {
	"LEG-001": { version: "2.1.0", sha256: "d5be5a8479bc85183cbd4514d3784094286ba95dc57247c5b5ffd46fd0942781" },
	"LEG-002": { version: "1.0.1", sha256: "678c752bf07bca40f351a201c1b6a6f27ab307291c0b1dd687c8bc4c6f484ffe" },
	"LEG-003": { version: "2.0.0", sha256: "fd541e14b8808782d74eb3699590d203312d2d6b4726f1e8551fba0bf6494603" },
	"LEG-004": { version: "0.1.0", sha256: "af32319072e36b51b608320202bf9c1d117446885f992739ac57d92c16fea20e" },
};

describe("legal copies", () => {
	it("four pages, the same slugs as the other sites, in the footer's order", () => {
		expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(["notice", "privacy", "cookies", "terms"]);
		expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(LEGAL_SLUGS);
		expect(LEGAL_PAGES.map((p) => legalHref(p.slug))).toEqual(["/legal/notice", "/legal/privacy", "/legal/cookies", "/legal/terms"]);
	});

	for (const page of LEGAL_PAGES) {
		const rel = `src/content/legal/${page.file}.md`;
		it(`${page.id} is the master, verbatim (${rel})`, () => {
			const text = read(rel);
			expect(text).toMatch(new RegExp(`^---\\nid: "${page.id}"`));
			expect(text).toContain(`version: "${PINS[page.id]!.version}"`);
			expect(createHash("sha256").update(text).digest("hex")).toBe(PINS[page.id]!.sha256);
		});

		it(`${page.id} carries its own reserved licence`, () => {
			const text = read(rel);
			expect(text).toContain("SPDX-FileCopyrightText: 2026 Numen Games S.L.");
			expect(text).toContain("SPDX-License-Identifier: LicenseRef-Numen-AllRightsReserved");
		});

		it(`${page.id}: the body a visitor reads holds nothing of the archive's record`, () => {
			const body = bodyOf(read(rel));
			expect(body).not.toMatch(/^---\n/);
			expect(legalProblems(body)).toEqual([]);
			expect(body).toContain(LEGAL_EMAIL);
		});
	}

	it("the hygiene check catches what it must", () => {
		for (const s of FORBIDDEN) expect(legalProblems(`x ${s} x`).length).toBeGreaterThan(0);
		expect(legalProblems("write to hello@example.org")).toEqual(["email other than legal@numengames.com: hello@example.org"]);
		expect(legalProblems("write to legal@numengames.com.")).toEqual([]);
		expect(bodyOf("---\nreview_flags: FLAG-1\n---\n# Body")).toBe("# Body");
	});
});

describe("footer and form link the local pages", () => {
	const footer = read("src/components/Footer.astro");
	it("the footer's Legal column is the four pages, then the cookie choice", () => {
		expect(footer).toContain("LEGAL_PAGES.map");
		expect(footer).toContain("legalHref(p.slug)");
		expect(footer).toContain("data-cookie-choice");
		expect(footer).toContain("Change my cookie choice");
		expect(footer.indexOf("LEGAL_PAGES.map")).toBeLessThan(footer.indexOf("Change my cookie choice"));
		expect(LEGAL_PAGES.map((p) => p.label)).toEqual(["Legal notice", "Privacy", "Cookies", "Terms"]);
	});
	it("nothing points at numen.games' legal pages any more", () => {
		for (const f of ["src/components/Footer.astro", "src/components/DeployForm.tsx", "src/lib/cookie-notice.ts"]) {
			expect(read(f)).not.toMatch(/numen\.games\/[a-z]{2}\/legal/);
		}
		const form = read("src/components/DeployForm.tsx");
		expect(form).toContain('href="/legal/terms"');
		expect(form).toContain('href="/legal/privacy"');
	});
});

// After `npm run build` the four routes must exist in the output; the
// postbuild step (scripts/legal-check.mjs) enforces the same on every build.
const built = path.join(root, "dist", "client", "legal");
describe.runIf(fs.existsSync(built))("built legal pages (dist/)", () => {
	for (const slug of LEGAL_SLUGS) {
		it(`/legal/${slug} is built, shows only the text, and has the footer links`, () => {
			const html = fs.readFileSync(path.join(built, slug, "index.html"), "utf8");
			expect(legalProblems(html)).toEqual([]);
			for (const s of LEGAL_SLUGS) expect(html).toContain(`href="/legal/${s}"`);
		});
	}
});
