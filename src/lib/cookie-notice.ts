// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The cookie notice (LEG-003 §4), shared shape across the four sites of
// Numen Games; only the SITE block differs (reference: numinia-archive
// web/src/lib/cookie-notice.ts). Library: vanilla-cookieconsent (MIT,
// orestbida/cookieconsent) — Accept all and Reject all side by side, equal
// weight, as the AEPD cookie guide asks; browsing accepts nothing.
//
// What this site stores is listed in LEG-003 §3.4 and mirrored in
// STORED_KEYS below; test/storage-inventory.test.ts fails when the code
// stores a key the policy does not name. This site has nothing optional:
// the day/night preference the visitor sets and the record of the choice
// itself, so the notice informs and both buttons end in the same state.
// Say so, do not pretend a choice.

import * as CookieConsent from "vanilla-cookieconsent";

/** LEG-003's major version. Raising it asks every visitor again. */
export const POLICY_REVISION = 2;

/** The cookie that records the choice (LEG-003 §3.4, first row). */
export const CONSENT_COOKIE = "numen_consent";

/** Every key this site writes, as LEG-003 §3.4 names it. */
export const STORED_KEYS = ["numen_consent", "numinia-modo"] as const;

const SITE = {
	policyHref: "/legal/cookies",
	noticeHref: "/legal/notice",
	title: "This site keeps very little in your browser",
	description: "Only day or night, if you choose it, and this answer. The workspace form sends what you type only when you submit it, and keeps none of it here. Nothing follows you. Both buttons leave the site the same.",
};

export function startCookieNotice(): void {
	void CookieConsent.run({
		revision: POLICY_REVISION,
		cookie: { name: CONSENT_COOKIE, expiresAfterDays: 182, sameSite: "Lax" },
		guiOptions: {
			consentModal: { layout: "box", position: "bottom right", equalWeightButtons: true, flipButtons: false },
			preferencesModal: { layout: "box", equalWeightButtons: true, flipButtons: false },
		},
		categories: {
			necessary: { enabled: true, readOnly: true },
		},
		language: {
			default: "en",
			translations: {
				en: {
					consentModal: {
						title: SITE.title,
						description: `${SITE.description} <a href="${SITE.policyHref}">Cookie policy</a>`,
						acceptAllBtn: "Accept all",
						acceptNecessaryBtn: "Reject all",
						showPreferencesBtn: "Preferences",
						footer: `<a href="${SITE.noticeHref}">Legal notice</a><a href="/legal/privacy">Privacy</a>`,
					},
					preferencesModal: {
						title: "What this site keeps",
						acceptAllBtn: "Accept all",
						acceptNecessaryBtn: "Reject all",
						savePreferencesBtn: "Save my choice",
						closeIconLabel: "Close",
						sections: [
							{
								title: "Needed, and yours",
								description: "Your day or night mode, if you pick one with the sun / moon button, and the record of this answer. You set them yourself; they cannot be switched off here, only deleted from your browser.",
								linkedCategory: "necessary",
							},
							{
								title: "Nothing else",
								description: `No measurement, no advertising, nothing from other companies. The full list, key by key, is in the <a href="${SITE.policyHref}">cookie policy</a>.`,
							},
						],
					},
				},
			},
		},
	});
}

/** The footer's "Change my cookie choice" button. */
export function reopenCookieNotice(): void {
	CookieConsent.showPreferences();
}
