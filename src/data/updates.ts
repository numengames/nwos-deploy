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
		version: "v0.11.0",
		date: "2026-09-30",
		entries: [
			{
				type: "CHG",
				text: "The home page now sells. It says what NWOS does for an organisation — it remembers, agents that know you, people decide, yours in plain files — and how you start: a trial for 29 €, then two ways on. On your own, or accompanied for 8 or 16 weeks by a contact person with Christian, María and Pablo behind them. The 29 € comes off the first invoice.",
			},
			{
				type: "ADD",
				text: "How it works (/how-it-works) explains the whole system. It draws the organisation, the people, the agents and the models as layers, with the person between the agents and the organisation and the shared memory crossing every layer. Then the three steps an agent takes each session, what a workspace holds, the layers underneath and the principles. The old technical home page lives here now, rewritten in plain words.",
			},
			{
				type: "CHG",
				text: "The bar has four entries: NWOS, How it works, Plans, and Try it · 29 €. On a tablet or a phone they open from the menu button.",
			},
			{
				type: "ADD",
				text: "The trial can be paid, in Stripe's test mode for now: the button reads \"Pay 29 € and create my workspace\" and takes you to Stripe's page.",
			},
		],
	},
	{
		version: "v0.10.0",
		date: "2026-09-30",
		entries: [
			{
				type: "ADD",
				text: "The footer carries a button with a coffee cup, Support Numinia, under the line that says what this site is. It opens numinia.com/support, where you can buy Numinia a coffee. The same button is in the footer of all four sites.",
			},
		],
	},
	{
		version: "v0.9.0",
		date: "2026-09-30",
		entries: [
			{
				type: "CHG",
				text: "The trial is paid: 29 € with VAT, one payment, one workspace. Every workspace costs us the AI model's work, so the form now shows the price before anything else, and its button says you are paying. If you then hire NWOS work, the 29 € comes off your first invoice; if the generation fails, we refund it in full.",
			},
			{
				type: "ADD",
				text: "Paying happens on Stripe's page and brings you back here. The server asks Stripe whether that payment exists and is for this workspace before the AI writes a single word; coming back with the same payment returns the same workspace, never a second one.",
			},
			{
				type: "CHG",
				text: 'Until the payment link exists the button says "Coming soon" and no workspace can be generated. The example workspace is still free to browse.',
			},
		],
	},
	{
		version: "v0.8.0",
		date: "2026-09-29",
		entries: [
			{
				type: "CHG",
				text: "The site now looks like the rest of the Numen Games family, drawn the way numinia.org draws it. The top bar opens with the Numen Games wordmark instead of the typed word NWOS, and its entries are plain labels with a small icon; the one you are on is underlined.",
			},
			{
				type: "CHG",
				text: 'Cards and panels have the house\'s softer 8 px corners, buttons and fields 6 px. Buttons say what they do in normal sentence case: "Deploy workspace", "Browse workspace", "Go to the form".',
			},
			{
				type: "CHG",
				text: "The landing's architecture layers show proper icons instead of emoji, and page titles rise into view the same way they do on numinia.org. The stars stay at night; by day the Deploy page shows plain paper.",
			},
		],
	},
	{
		version: "v0.7.0",
		date: "2026-09-29",
		entries: [
			{
				type: "FIX",
				text: "The workspace form is in English, like the rest of the site: the field names, the checkbox, the progress messages and the errors. The checkbox now says you accept the Terms and have read the Privacy Policy.",
			},
			{
				type: "ADD",
				text: "When your workspace is ready, a note next to it says plainly that its documents were written by an AI model (Claude, by Anthropic) from public sources, and that they are drafts to check before you rely on them. Provisional wording until the company's lawyers review it.",
			},
			{
				type: "FIX",
				text: "The cookie notice shows Accept all and Reject all side by side and the same size on every screen, as on the other three sites. They were stacked one above the other.",
			},
			{
				type: "CHG",
				text: "The legal notice (version 0.2.0) gives the company's entry in the Mercantile Registry of Madrid and the postal code of its registered address. The cookie policy is version 2.1.0, which adds a key numinia.org keeps; nothing changes on this site.",
			},
		],
	},
	{
		version: "v0.6.0",
		date: "2026-09-29",
		entries: [
			{
				type: "ADD",
				text: "This site now has its own legal pages: Legal notice, Privacy, Cookies and Terms, at /legal/notice, /legal/privacy, /legal/cookies and /legal/terms. They are the company's texts, copied word for word from the archive, and they say themselves which sites they cover. The footer's Legal column links them here instead of sending you to numen.games, and the workspace form's checkbox now links the Terms and the Privacy policy it asks you to accept.",
			},
			{
				type: "ADD",
				text: "A cookie notice on your first visit, with Accept all and Reject all side by side and the same size. This site keeps only your day or night choice, if you make one, and your answer to the notice; nothing optional, so both buttons leave the site the same. Browsing without answering accepts nothing. 'Change my cookie choice' in the footer brings the notice back.",
			},
		],
	},
	{
		version: "v0.5.0",
		date: "2026-09-24",
		entries: [
			{
				type: "CHG",
				text: "Loading now says so in the house way: 'Loading workspace···' with three waiting dots (animation 07 of the design system) instead of a spinning ring and a blinking line. With reduced motion the dots stand still.",
			},
			{
				type: "CHG",
				text: "The menu arrow and the mobile menu icon are now Phosphor, the house icon family, instead of hand-drawn lines.",
			},
			{
				type: "FIX",
				text: "Small grey labels on the home page layers and on the /updates tags were a touch too faint at night (4.3:1); they now read at the house minimum. The scrollbar takes the control radius, one of the system's two.",
			},
		],
	},
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
	{ status: "planned", text: "Real telemetry of the service: workspaces generated, time to first deploy. Today /telemetry says only version and commit." },
];

/** The newest version — what the footer prints. */
export const CURRENT_VERSION: string = UPDATES[0]!.version;
