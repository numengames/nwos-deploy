// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The site's version timeline, newest first — what each production push
// changed, and what is pending. The footer prints the newest version and
// links here; the same page exists on numinia.com, numinia.org and
// numen.games (decision of 2026-09-16, modelled on numinia.com/updates).
//
// THE RULE: every pull request that changes src/** adds an entry here and
// raises the minor. CI refuses the merge otherwise
// (scripts/check-version-bump.mjs).
export interface UpdateEntry {
	readonly type: "ADD" | "CHG" | "FIX" | "DEL";
	readonly text: string;
}

export interface UpdateVersion {
	readonly version: string;
	readonly date: string;
	readonly entries: readonly UpdateEntry[];
}

export interface PendingItem {
	readonly status: "planned" | "blocked";
	readonly text: string;
}

export const UPDATES: readonly UpdateVersion[] = [
	{
		version: "v0.4.0",
		date: "2026-09-24",
		entries: [
			{
				type: "ADD",
				text: "Day and night (DSN-016): a button in the bar showing the moon with stars or the sun for where a tap leads. Until you choose, the page follows your device; once you choose, it remembers (key numinia-modo, the same as numinia.com) and does not flash on reload. The day colours are generated from the design kit like the night ones; the sky shows only at night, and El Velo's opening scene keeps its night inside the day page.",
			},
		],
	},
	{
		version: "v0.3.1",
		date: "2026-09-19",
		entries: [
			{
				type: "FIX",
				text: "The reference implementation this page links to is numengames/numinia-archive — the name the repository has had since 2026-09-17. The link and the design kit the site is built with said numinia-nwos and worked only because GitHub redirects the old name.",
			},
		],
	},
	{
		version: "v0.3.0",
		date: "2026-09-18",
		entries: [
			{
				type: "ADD",
				text: "A link to this site presents itself (DSN-014): the scarab as favicon, a title and description that say this is the service — NWOS for your organisation — not the archive, and a 1200×630 share card drawn at build. The share image was a broken link (og-default.png did not exist).",
			},
		],
	},
	{
		version: "v0.2.0",
		date: "2026-09-18",
		entries: [
			{
				type: "CHG",
				text: "The repository keeps code only: the superseded DESIGN.md, the two iteration guides written for the personal site this service was extracted from, and the TODO register are retired — the rules, the vocabulary and the decisions of the house live in numinia-nwos (numinia.org). Nothing changes on the site.",
			},
		],
	},
	{
		version: "v0.1.0",
		date: "2026-09-16",
		entries: [
			{
				type: "ADD",
				text: "This page. The timeline starts here: the service had shipped without a version record.",
			},
			{
				type: "CHG",
				text: "The footer takes the house shape, the same on the four Numen Games sites: brand as text with one line saying what this service is; a Numen Games column naming the company, the game and the archive with this site marked; Legal; Social with the GitHub organisation; the closing line — scarab, signature, licence · telemetry · version · commit.",
			},
			{
				type: "DEL",
				text: "«© Numen Games. All rights reserved» — the service is free software under AGPL-3.0-only, declared per path in REUSE.toml; a blanket reservation contradicted the licence it had already granted.",
			},
			{
				type: "DEL",
				text: "Two personal social accounts that stood in for the house's.",
			},
		],
	},
];

export const PENDING: readonly PendingItem[] = [
	{ status: "blocked", text: "Company accounts on X and Discord for the Social column — waiting on the Oracle." },
	{ status: "planned", text: "Legal texts on this domain: Terms and Privacy are published on the other three sites from the numinia-nwos masters; this one links to numen.games' until it serves its own." },
	{ status: "planned", text: "Real telemetry of the service: workspaces generated, time to first deploy. Today /telemetry says only version and commit." },
];

/** The newest version — what the footer prints. */
export const CURRENT_VERSION: string = UPDATES[0]!.version;
