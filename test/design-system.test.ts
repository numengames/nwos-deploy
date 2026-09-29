// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The site drawn the way numinia.org draws the house design system
// (STD-023, BLU-009): the bar opens with the Numen Games wordmark, entries
// are Mono labels with a Phosphor icon, two radii only (6 px controls, 8 px
// frames), Geist everywhere, motion only from the catalogue, no emoji as
// icons. This reads the source, so a regression names the file.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

function walk(dir: string): string[] {
	return readdirSync(path.join(root, dir)).flatMap((name) => {
		const rel = path.join(dir, name);
		return statSync(path.join(root, rel)).isDirectory() ? walk(rel) : [rel];
	});
}

// What a visitor sees: pages, components, layouts and the hand-written CSS.
// tokens.css is generated from the kit and is not ours to police here.
const chrome = walk("src").filter((f) => /\.(astro|tsx|css)$/.test(f) && !f.endsWith("tokens.css"));

const offenders = (re: RegExp) =>
	chrome.flatMap((f) =>
		read(f)
			.split("\n")
			.map((line, i) => (re.test(line) ? `${f}:${i + 1}: ${line.trim().slice(0, 120)}` : null))
			.filter((x): x is string => x !== null),
	);

describe("the bar", () => {
	const nav = read("src/components/Navigation.astro");

	it("opens with the Numen Games wordmark, never typed text", () => {
		expect(nav).toMatch(/import wordmark from "@\/brand\/Numen_Games_Horizontal_Word\.svg\?raw"/);
		expect(nav).toMatch(/aria-label="Numen Games"[^>]*set:html=\{wordmark\}/);
		expect(nav).not.toMatch(/NW<em/);
	});

	it("draws entries as Mono labels with a 14 px icon, not pills", () => {
		expect(nav).not.toMatch(/rounded-full/);
		expect(nav).not.toMatch(/Try NWOS/);
		expect(nav).toMatch(/<Icon name=\{e\.icon\} size=\{14\} \/>/);
		expect(nav).toMatch(/border-b-2 border-teal/);
	});

	it("keeps the day-and-night switch", () => {
		expect(nav).toMatch(/data-mode-switch/);
	});
});

describe("the brand file", () => {
	it("is the canonical wordmark, reserved in REUSE.toml", () => {
		expect(read("src/brand/Numen_Games_Horizontal_Word.svg")).toMatch(/fill="currentColor"/);
		expect(read("REUSE.toml")).toMatch(/"src\/brand\/\*\*"\][\s\S]*?LicenseRef-Numen-AllRightsReserved/);
	});
});

describe("two radii only", () => {
	it("uses no Tailwind radius step outside control (6) and frame (8)", () => {
		expect(offenders(/\brounded-(xs|sm|md|lg|xl|2xl|3xl|full)\b|\brounded(?![-\w])|\[&_\w+\]:rounded(?![-\w])/)).toEqual([]);
	});

	it("writes no border-radius in px other than 6 or 8", () => {
		expect(offenders(/border-radius:\s*(?!\s|var\(--radius|6px|8px|50%)/)).toEqual([]);
	});
});

describe("type", () => {
	it("never falls back to Georgia or a serif", () => {
		expect(offenders(/Georgia|(?<!sans-)\bserif\b/)).toEqual([]);
	});

	it("sets the page headline in Geist 400, tracked -0.025em", () => {
		const hero = read("src/components/PageHero.astro");
		expect(hero).toMatch(/font-normal/);
		expect(hero).toMatch(/tracking-\[-0\.025em\]/);
	});
});

describe("motion from the catalogue only", () => {
	it("has no spin, pulse, bounce, ping or twinkle", () => {
		expect(offenders(/animate-(spin|pulse|bounce|ping)|twinkle/)).toEqual([]);
	});

	it("enters in 600 ms on the house curve, staggered 100 ms", () => {
		const css = read("src/styles/global.css");
		expect(css).toMatch(/--animate-entrada: entrada 600ms cubic-bezier\(0\.2, 0, 0, 1\) both;/);
		expect(css).toMatch(/--animate-entrada-1: entrada 600ms cubic-bezier\(0\.2, 0, 0, 1\) 100ms both;/);
		expect(css).toMatch(/--animate-entrada-2: entrada 600ms cubic-bezier\(0\.2, 0, 0, 1\) 200ms both;/);
		expect(css).not.toMatch(/slideUp/);
	});
});

describe("icons", () => {
	it("are Phosphor files, never emoji", () => {
		expect(offenders(/\p{Extended_Pictographic}/u)).toEqual([]);
	});

	it("every vendored icon is declared MIT in REUSE.toml", () => {
		const reuse = read("REUSE.toml");
		for (const f of readdirSync(path.join(root, "src/icons"))) expect(reuse).toContain(`"src/icons/${f}"`);
	});
});
