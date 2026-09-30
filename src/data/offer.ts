// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// What NWOS sells and in what order, the one place the home page and
// /how-it-works read it from. The trial's price and payment link live in
// trial.ts; this holds the path after it. Written by the Oracle's brief of
// 2026-09-30: first a paid trial, then either run it alone or be
// accompanied by the quarter — a contact person with the team behind —
// in two packages, 1 + 1 and 3 + 1: implementation quarters, then one
// quarter of follow-up. 80 % is paid before the first quarter starts, the
// remaining 20 % before the follow-up. Prices are for organisations, so
// they are shown before VAT. Market reading behind them: the PR body.

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
		text: `Run it on your own, or let us accompany you by the quarter until your team runs it without us. If you choose us, the ${TRIAL.priceEur} € comes off the first invoice.`,
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
		price: "By the quarter",
		priceNote: "two packages below",
		includes: ["One contact person who carries the day-to-day with you", "Our team behind them on the implementation", "We train your team, learn your processes and find where AI adds most value: what to improve, what to automate, which tools to use", "We build the specific pieces — agents, protocols, documents — and leave the work flowing", "Weekly progress you can read in your own workspace"],
		cta: { label: "Talk to us", href: contactHref("NWOS — accompanied") },
	},
];

export interface Package {
	readonly id: "1+1" | "3+1";
	readonly name: string;
	/** Implementation quarters, then follow-up quarters. */
	readonly build: number;
	readonly follow: number;
	/** Whole package, EUR before VAT. */
	readonly priceEur: number;
	/** Hours bought: training and implementation over the build quarters,
	 *  and the follow-up quarter's hours. Analysis and feedback sessions
	 *  are part of them. What they are spent on is fixed in the analysis. */
	readonly hours: { readonly training: number; readonly implementation: number; readonly followUp: number };
	readonly title: string;
	readonly text: string;
}

/** Share paid before the first quarter; the rest before the follow-up. */
export const UPFRONT = 0.8;

export const PACKAGES: readonly Package[] = [
	{
		id: "1+1",
		name: "1 + 1",
		build: 1,
		follow: 1,
		priceEur: 15000,
		hours: { training: 30, implementation: 80, followUp: 24 },
		title: "One area, running",
		text: "A quarter to bring one area of your organisation into NWOS — its memory, its first agents, your people trained — and a quarter of follow-up while your team runs it.",
	},
	{
		id: "3+1",
		name: "3 + 1",
		build: 3,
		follow: 1,
		priceEur: 40000,
		hours: { training: 90, implementation: 240, followUp: 36 },
		title: "The organisation, running",
		text: "Three quarters of implementation across several areas, your own agents with names and rules, and a quarter of steadier follow-up until the habit is settled.",
	},
];

export function eur(n: number): string {
	return `${n.toLocaleString("en-GB")} €`;
}

/** What is paid when: before the first quarter, and before the follow-up. */
export function instalments(p: Package): { upfront: number; followUp: number } {
	const upfront = Math.round(p.priceEur * UPFRONT);
	return { upfront, followUp: p.priceEur - upfront };
}

export type PhaseKind = "meet" | "analysis" | "build" | "test" | "feedback" | "training" | "review";

export interface Phase {
	readonly kind: PhaseKind;
	readonly label: string;
	/** Weeks of the quarter, 1–13, inclusive. */
	readonly from: number;
	readonly to: number;
	readonly text: string;
}

export const QUARTER_WEEKS = 13;

/** How an implementation quarter runs: a kick-off, three weeks of
 *  analysis, then two cycles of build → test → feedback, because in three
 *  months something always stops working or changes. Training runs
 *  alongside from the first week. Shape taken from common practice:
 *  diagnosis first (3–6 weeks for a small company), then short build
 *  cycles closed by a review with the people who use the result. */
export const QUARTER_PLAN: readonly Phase[] = [
	{ kind: "meet", label: "Kick-off", from: 1, to: 1, text: "A first meeting with whoever leads each area: what hurts, what you expect, who is our contact on your side." },
	{ kind: "analysis", label: "Analysis", from: 1, to: 3, text: "We talk to each department and each person who will use it, map how work flows today and choose what to improve, automate or leave alone. The result is a written plan in your workspace." },
	{ kind: "training", label: "Training", from: 2, to: 12, text: "Sessions with your team every week: the method, the workspace, the tools and the agents, on your own work." },
	{ kind: "build", label: "Cycle 1 · build", from: 4, to: 6, text: "We build the first pieces: the memory of the chosen area, its protocols and its first agents." },
	{ kind: "test", label: "Cycle 1 · test", from: 7, to: 8, text: "Your people use it on real work; we watch what breaks and what nobody uses." },
	{ kind: "feedback", label: "Feedback", from: 8, to: 8, text: "A session with everyone involved: what works, what does not, what changed. It sets cycle 2." },
	{ kind: "build", label: "Cycle 2 · adjust", from: 9, to: 10, text: "We fix what failed and build what the first cycle revealed." },
	{ kind: "test", label: "Cycle 2 · test", from: 11, to: 12, text: "Back on real work, now with your team running it and us beside them." },
	{ kind: "feedback", label: "Feedback", from: 12, to: 12, text: "The second session: what is settled and what still needs us." },
	{ kind: "review", label: "Quarter review", from: 13, to: 13, text: "What runs, what your team now does alone, and what comes next — the next quarter or the follow-up." },
];

/** The follow-up quarter: lighter, on your team's rhythm. */
export const FOLLOW_UP: readonly string[] = ["A feedback session every month with your contact person", "Hours to fix, adjust and answer questions as they come", "A closing review: what runs on its own, and what you would change"];

/** Why there is no lock-in — the promise the accompanied plan ends on. */
export const NO_LOCK_IN: readonly { readonly title: string; readonly text: string }[] = [
	{ title: "Your files, your repository", text: "Everything we build lives in your workspace, in plain text you own. Nothing runs on a platform of ours." },
	{ title: "Your team, trained", text: "We teach your people the method and the tools as we go. The accompaniment ends when they no longer need us, not when a contract says so." },
	{ title: "Your models, your choice", text: "The agents run on the AI model you choose and can move to another. Change provider, keep the memory." },
	{ title: "Leave whenever you want", text: "After the follow-up there is nothing to renew. If you come back, it is because it is worth it." },
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
		q: "How is the accompaniment paid?",
		a: "By package. 80 % before the first quarter starts, the other 20 % before the follow-up quarter. Prices are before VAT.",
	},
	{
		q: "What happens when the accompaniment ends?",
		a: "Nothing is switched off. The workspace, the agents and the processes are yours, and your team knows how to run them. That is the point of the follow-up quarter.",
	},
	{
		q: "Who can buy it?",
		a: "Organisations and professionals. You pay by card on Stripe's page and receive the invoice there.",
	},
];
