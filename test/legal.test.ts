// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// SIT-005 (STD-037): the legal texts have one address, numinia.org. This
// site never keeps its own copy; it links the published master. These
// tests check the link shape and that the build-time check
// (scripts/legal-check.mjs) actually catches a local copy if one reappears.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_MASTER_ORIGIN, LEGAL_PAGES, legalHref } from "../src/data/legal";
import { findLocalCopies, FORBIDDEN_CONTENT, FORBIDDEN_PATH_SEGMENTS } from "../scripts/legal-check.mjs";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

describe("legal links", () => {
	it("four pages, the same slugs as the other sites, in the footer's order", () => {
		expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(["notice", "privacy", "cookies", "terms"]);
		expect(LEGAL_PAGES.map((p) => p.label)).toEqual(["Legal notice", "Privacy", "Cookies", "Terms"]);
	});

	it("every legal page links the archive's one address, never a local route", () => {
		for (const page of LEGAL_PAGES) {
			expect(legalHref(page.slug)).toBe(`https://numinia.org/legal/${page.slug}`);
			expect(legalHref(page.slug).startsWith(LEGAL_MASTER_ORIGIN)).toBe(true);
		}
	});

	it("no local copy of the legal texts is kept in this repo (src/content/legal, src/pages/legal)", () => {
		expect(fs.existsSync(path.join(root, "src/content/legal"))).toBe(false);
		expect(fs.existsSync(path.join(root, "src/pages/legal"))).toBe(false);
		expect(findLocalCopies(root)).toEqual([]);
	});
});

describe("footer and form link numinia.org, never a local legal route", () => {
	const footer = read("src/components/Footer.astro");
	it("the footer's Legal column is the four pages, external, then the cookie choice", () => {
		expect(footer).toContain("LEGAL_PAGES.map");
		expect(footer).toContain("legalHref(p.slug)");
		expect(footer).toContain('target="_blank"');
		expect(footer).toContain("data-cookie-choice");
		expect(footer).toContain("Change my cookie choice");
		expect(footer.indexOf("LEGAL_PAGES.map")).toBeLessThan(footer.indexOf("Change my cookie choice"));
	});
	it("nothing points at a local /legal/ route or numen.games' legal pages", () => {
		for (const f of ["src/components/Footer.astro", "src/components/DeployForm.tsx", "src/lib/cookie-notice.ts"]) {
			const text = read(f);
			expect(text).not.toMatch(/numen\.games\/[a-z]{2}\/legal/);
			expect(text).not.toMatch(/href="\/legal\//);
		}
		const form = read("src/components/DeployForm.tsx");
		expect(form).toContain('href="https://numinia.org/legal/terms"');
		expect(form).toContain('href="https://numinia.org/legal/privacy"');
	});
	it("the form speaks the site's language: English, no Spanish left", () => {
		for (const f of ["src/components/DeployForm.tsx", "src/pages/api/registro.ts"]) {
			const visible = read(f)
				.split("\n")
				.filter((l) => !/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(l))
				.join("\n");
			const strings = visible.match(/"[^"\n]*"|>[^<>{}\n]+</g) ?? [];
			expect(strings.filter((t) => /[áéíóúñ¿¡]/i.test(t))).toEqual([]);
		}
		const form = read("src/components/DeployForm.tsx");
		expect(form).toContain("I accept the");
	});
	it("says where the visitor sees the result that an AI model drafted it (AI Act art. 50, DBT-022 #32)", () => {
		const form = read("src/components/DeployForm.tsx");
		const success = form.slice(form.indexOf("Success state"), form.indexOf("Form state"));
		expect(success).toContain("data-ai-notice");
		expect(success).toContain("Written by an AI model.");
		expect(success).toMatch(/artificial intelligence model \(Claude, by Anthropic\)/);
	});
});

describe("legal-check catches a local copy if one reappears", () => {
	it("flags a src/content/legal-shaped path", () => {
		expect(FORBIDDEN_PATH_SEGMENTS).toContain("content/legal");
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "legal-check-"));
		fs.mkdirSync(path.join(tmp, "src", "content", "legal"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "src", "content", "legal", "x.md"), "hello");
		expect(findLocalCopies(tmp).length).toBeGreaterThan(0);
	});

	it("flags a Markdown file whose frontmatter carries an archive legal-document id and type", () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "legal-check-"));
		const master = '---\nid: "LEG-001"\ntype: legal\n---\n# Copy\n';
		fs.writeFileSync(path.join(tmp, "copied-master.md"), master);
		expect(findLocalCopies(tmp).length).toBeGreaterThan(0);
		for (const re of FORBIDDEN_CONTENT) expect(re.test(master)).toBe(true);
	});

	it("a normal Markdown file, unrelated to the legal texts, passes clean", () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "legal-check-"));
		fs.writeFileSync(path.join(tmp, "README.md"), '---\nid: "LEG-001"\n---\n# Not a legal type\n');
		expect(findLocalCopies(tmp)).toEqual([]);
	});
});
