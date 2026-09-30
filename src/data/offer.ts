// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// What NWOS sells and in what order, the one place the home page and
// /how-it-works read it from. The trial's price and payment link live in
// trial.ts; this holds the path after it. Written by the Oracle's brief of
// 2026-09-30: first a paid trial, then either run it alone or be
// accompanied for 8 or 16 weeks by a contact person with the team behind.

import { TRIAL } from "@/data/trial";

export const CONTACT_EMAIL = "hola@numengames.com";

export function contactHref(subject: string): string {
	return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export interface Step {
	readonly n: string;
	readonly title: string;
	readonly text: string;
}

/** The sale, step by step, as a buyer lives it. */
export const PATH: readonly Step[] = [
	{
		n: "01",
		title: `Try it · ${TRIAL.priceEur} €`,
		text: "Type your organisation's name. In two minutes you have your own workspace: a private repository with the whole structure and four founding documents — mission, culture, structure, glossary — drafted by AI from what is public about you.",
	},
	{
		n: "02",
		title: "Read it with your team",
		text: "Correct what the AI inferred, keep what fits. The workspace is yours from the first minute, whatever you decide next.",
	},
	{
		n: "03",
		title: "Choose how to go on",
		text: `Run it on your own, or let us accompany you for 8 or 16 weeks. If you choose us, the ${TRIAL.priceEur} € comes off the first invoice.`,
	},
];

export interface Plan {
	readonly id: "own" | "accompanied";
	readonly name: string;
	readonly forWhom: string;
	readonly price: string;
	readonly priceNote: string;
	readonly includes: readonly string[];
	readonly cta: { readonly label: string; readonly href: string };
}

export const PLANS: readonly Plan[] = [
	{
		id: "own",
		name: "On your own",
		forWhom: "For teams that already work with AI and want the structure to do it well.",
		price: "No subscription",
		priceNote: "after the trial",
		includes: ["Your workspace stays yours: a repository you own", "The open method: conventions, templates, protocols", "numinia.org, where we run our own company this way, to copy from", "Your own agents, on the model you choose"],
		cta: { label: `Start with the trial · ${TRIAL.priceEur} €`, href: "/velo" },
	},
	{
		id: "accompanied",
		name: "Accompanied",
		forWhom: "For organisations that want help bringing AI into how they work, designed for them.",
		price: "8 or 16 weeks",
		priceNote: "on proposal",
		includes: ["One contact person who carries the day-to-day with you", "The team behind them — Christian, María and Pablo — on the implementation", "We find where AI adds most value to you, and build the specific pieces: agents, protocols, documents", "Weekly progress you can read in your own workspace"],
		cta: { label: "Talk to us", href: contactHref("NWOS — accompanied") },
	},
];

export interface Span {
	readonly weeks: number;
	readonly title: string;
	readonly text: string;
}

/** What each length is for — the proposal fixes the detail. */
export const SPANS: readonly Span[] = [
	{
		weeks: 8,
		title: "One area, running",
		text: "We pick one area of your organisation with you, put its memory in the workspace and leave its first agents working inside it, with your people approving.",
	},
	{
		weeks: 16,
		title: "The organisation, running",
		text: "Several areas, your own agents with names and rules, and the habit settled: your team reads and writes the workspace without us.",
	},
];

export interface Question {
	readonly q: string;
	readonly a: string;
}

export const FAQ: readonly Question[] = [
	{
		q: "Whose is the workspace?",
		a: "Yours. It is a private repository with your licence, and the drafts are yours from the moment they are written. If you stop working with us, it stays with you.",
	},
	{
		q: "What exactly does the AI write in the trial?",
		a: "Four drafts — mission, vision and values; culture; structure; glossary — from public sources about your organisation. Every part it had to infer is marked for review.",
	},
	{
		q: `Why does the trial cost ${TRIAL.priceEur} €?`,
		a: `Every workspace costs us the AI model's work. ${TRIAL.priceEur} € with VAT covers it; if you then hire us, it comes off your first invoice. If the generation fails, we refund it in full.`,
	},
	{
		q: "Do I need to be technical?",
		a: "To try it, no: a name and an email. To run it on your own, someone who is at ease with git helps. Accompanied, we do that part with you.",
	},
	{
		q: "Who can buy it?",
		a: "Organisations and professionals. You pay by card on Stripe's page and receive the invoice there.",
	},
];
