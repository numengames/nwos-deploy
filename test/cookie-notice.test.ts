// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The cookie notice's contract (LEG-003 §4): Accept all and Reject all of
// equal weight, side by side; nothing optional on this site; the choice
// kept six months in numen_consent.
import type { CookieConsentConfig } from "vanilla-cookieconsent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { run, showPreferences } = vi.hoisted(() => ({
	run: vi.fn((_cfg: CookieConsentConfig) => Promise.resolve()),
	showPreferences: vi.fn(),
}));
vi.mock("vanilla-cookieconsent", () => ({ run, showPreferences }));

describe("cookie notice", () => {
	beforeEach(() => {
		run.mockClear();
		showPreferences.mockClear();
	});

	it("runs with the house contract", async () => {
		const { startCookieNotice } = await import("../src/lib/cookie-notice");
		startCookieNotice();
		expect(run).toHaveBeenCalledTimes(1);
		const cfg = run.mock.calls[0]![0];
		expect(cfg.revision).toBe(2);
		expect(cfg.cookie).toEqual({ name: "numen_consent", expiresAfterDays: 182, sameSite: "Lax" });
		for (const m of [cfg.guiOptions?.consentModal, cfg.guiOptions?.preferencesModal]) {
			expect(m?.equalWeightButtons).toBe(true);
			expect(m?.flipButtons).toBe(false);
		}
		// Nothing optional here: one read-only category, no measurement.
		expect(Object.keys(cfg.categories)).toEqual(["necessary"]);
		expect(cfg.categories.necessary!.readOnly).toBe(true);
		// hideFromBots stays at the library's default (true).
		expect(cfg.hideFromBots).toBeUndefined();
		const en = cfg.language.translations.en as Exclude<CookieConsentConfig["language"]["translations"][string], string | (() => unknown)>;
		expect(en.consentModal.acceptAllBtn).toBe("Accept all");
		expect(en.consentModal.acceptNecessaryBtn).toBe("Reject all");
		expect(en.consentModal.description).toContain("Both buttons leave the site the same");
		expect(en.consentModal.description).toContain('href="/legal/cookies"');
	});

	it("the footer button reopens the preferences", async () => {
		const { reopenCookieNotice } = await import("../src/lib/cookie-notice");
		reopenCookieNotice();
		expect(showPreferences).toHaveBeenCalledTimes(1);
	});
});
