// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The site sells, and explains (the Oracle, 2026-09-30). The home page shows
// the path — trial, then on your own or accompanied for 8 or 16 weeks — and
// /how-it-works draws the layers with the person between the agents and the
// organisation. The price is read from trial.ts everywhere, never typed.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TRIAL } from "@/data/trial";
import { PATH, PLANS, SPANS, FAQ, contactHref, CONTACT_EMAIL } from "@/data/offer";

const read = (p: string) => readFileSync(path.resolve(__dirname, "..", p), "utf8");

describe("the offer", () => {
	it("walks the sale in three steps, starting with the paid trial", () => {
		expect(PATH).toHaveLength(3);
		expect(PATH[0]!.title).toContain(`${TRIAL.priceEur} €`);
	});

	it("offers two ways on: on your own, and accompanied", () => {
		expect(PLANS.map((p) => p.id)).toEqual(["own", "accompanied"]);
		expect(PLANS.find((p) => p.id === "accompanied")!.includes.join(" ")).toMatch(/contact person/);
	});

	it("the accompanied service comes in 8 or 16 weeks", () => {
		expect(SPANS.map((s) => s.weeks)).toEqual([8, 16]);
	});

	it("says the trial is deducted and refunded if it fails", () => {
		const all = [...PATH.map((s) => s.text), ...FAQ.map((f) => f.a)].join(" ");
		expect(all).toMatch(/comes off (the|your) first invoice/);
		expect(all).toMatch(/refund it in full/);
	});

	it("contact links carry the subject", () => {
		expect(contactHref("NWOS — accompanied")).toBe(`mailto:${CONTACT_EMAIL}?subject=NWOS%20%E2%80%94%20accompanied`);
	});
});

describe("the pages", () => {
	const home = read("src/pages/index.astro");
	const how = read("src/pages/how-it-works.astro");
	const nav = read("src/components/Navigation.astro");

	it("home reads its offer and price from the data, never types 29", () => {
		expect(home).toMatch(/from "@\/data\/offer"/);
		expect(home).not.toMatch(/\b29\s*€/);
		expect(home).toMatch(/id="plans"/);
	});

	it("how it works draws the organisation, people, agents, models and the shared memory", () => {
		for (const id of ["organisation", "people", "agents", "infrastructure"]) expect(how).toContain(`id: "${id}"`);
		expect(how).toContain('data-layer="memory"');
		// the person stands between the agents and the organisation
		const order = ["organisation", "people", "agents"].map((id) => how.indexOf(`id: "${id}"`));
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it("the bar leads to how it works, the plans and the trial", () => {
		expect(nav).toMatch(/href: "\/how-it-works"/);
		expect(nav).toMatch(/href: "\/#plans"/);
		expect(nav).toMatch(/href: "\/velo"/);
	});
});
