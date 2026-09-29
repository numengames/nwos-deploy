// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The four legal texts this site publishes, in the footer's order (Legal
// notice · Privacy · Cookies · Terms). Each one is a verbatim copy of its
// master in numengames/numinia-archive, folder legal/, kept in
// src/content/legal/. Never edit the copies: the archive is the source.
// Refreshing a copy = copy the master again and update the pin in
// test/legal.test.ts.
export interface LegalPage {
	readonly slug: "notice" | "privacy" | "cookies" | "terms";
	/** The master's id, as its frontmatter names it. */
	readonly id: string;
	/** The copied file under src/content/legal/, without `.md`. */
	readonly file: string;
	/** The footer's label. */
	readonly label: string;
}

export const LEGAL_PAGES: readonly LegalPage[] = [
	{ slug: "notice", id: "LEG-004", file: "LEG-004-legal-notice-numengames", label: "Legal notice" },
	{ slug: "privacy", id: "LEG-001", file: "LEG-001-privacy-policy-numengames", label: "Privacy" },
	{ slug: "cookies", id: "LEG-003", file: "LEG-003-cookie-policy-numengames", label: "Cookies" },
	{ slug: "terms", id: "LEG-002", file: "LEG-002-terms-and-conditions-numengames", label: "Terms" },
];

export const legalHref = (slug: LegalPage["slug"]): string => `/legal/${slug}`;
