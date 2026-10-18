// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The four legal texts that apply to this site, in the footer's order
// (Legal notice · Privacy · Cookies · Terms). SIT-005 (STD-037): the legal
// texts have one address — numinia.org, the archive's own site. This repo
// never keeps a copy of them; it links the published master directly.
// `scripts/legal-check.mjs` fails the build if a local copy reappears.
export interface LegalPage {
	readonly slug: "notice" | "privacy" | "cookies" | "terms";
	/** The footer's label. */
	readonly label: string;
}

export const LEGAL_PAGES: readonly LegalPage[] = [
	{ slug: "notice", label: "Legal notice" },
	{ slug: "privacy", label: "Privacy" },
	{ slug: "cookies", label: "Cookies" },
	{ slug: "terms", label: "Terms" },
];

/** The archive's own site: the one address every Numen Games site links. */
export const LEGAL_MASTER_ORIGIN = "https://numinia.org";

export const legalHref = (slug: LegalPage["slug"]): string => `${LEGAL_MASTER_ORIGIN}/legal/${slug}`;
