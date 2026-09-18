// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The timeline and the house column are data the footer prints on every
// page: fixed shape, no surprises.
import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, PENDING, UPDATES } from "../src/data/updates";
import { HOUSE_LINKS, THIS_SITE } from "../src/data/house-links";
import { socialLinks } from "../src/data/social-links";

describe("updates", () => {
	it("newest first, and that is what the footer prints", () => {
		expect(CURRENT_VERSION).toBe(UPDATES[0]!.version);
		expect(CURRENT_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
		for (const u of UPDATES) {
			expect(u.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(u.entries.length).toBeGreaterThan(0);
		}
		for (const p of PENDING) expect(["planned", "blocked"]).toContain(p.status);
	});
});

describe("house-links", () => {
	it("names the four sites once each, this one being the service", () => {
		expect(HOUSE_LINKS.map((l) => l.id).sort()).toEqual(["archive", "company", "game", "service"]);
		expect(THIS_SITE).toBe("service");
		for (const l of HOUSE_LINKS) {
			expect(l.href).toMatch(/^https:\/\/(numen\.games|numinia\.com|numinia\.org|nwos\.numen\.games)$/);
		}
	});
});

describe("social-links", () => {
	it("never points at a personal account", () => {
		for (const l of socialLinks) {
			expect(l.href).toMatch(/^https:\/\//);
			expect(l.href).not.toMatch(/PabloFMM|Pablo_FMM|linkedin\.com\/in\//i);
		}
	});
});
