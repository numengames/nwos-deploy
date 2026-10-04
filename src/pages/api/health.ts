// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// GET /api/health — what is configured, told without any value.
//
// Before this route, a missing secret showed the buyer "Server
// configuration incomplete" and told the Oracle nothing: the reason only
// reached Cloudflare's log, which is panel-only and expires (QA
// 2026-10-03). This answers, from any phone, WHICH setting is missing and
// whether the processor is in test mode — and never prints a secret: only
// a boolean and, for the payment link, its public prefix.
//
// It takes no secret in the query string, so it stays readable by anyone;
// nothing here is a credential, and a test asserts that no value of the
// environment appears in the body.
import type { APIRoute } from "astro";
import { getEnv } from "@/lib/env";
import { keySecret } from "@/lib/token";
import { TRIAL, trialOnSale } from "@/data/trial";

export const prerender = false;

/** Minimum length of an HMAC secret worth the name (openssl rand -hex 32). */
const MIN_SECRET_LENGTH = 32;

export interface HealthReport {
	/** Can a buyer complete the paid trial right now? */
	readonly trial: "open" | "paused";
	/** Which settings the trial needs, and whether each one is present. */
	readonly settings: Readonly<Record<string, boolean>>;
	/** Settings present but not usable, with the reason. */
	readonly warnings: readonly string[];
	/** What a visitor can do with no configuration at all. */
	readonly alwaysAvailable: readonly string[];
}

export function report(env: ReturnType<typeof getEnv>): HealthReport {
	const secret = keySecret(env);
	const settings = {
		GITHUB_ORG: Boolean(env.GITHUB_ORG),
		GITHUB_TEMPLATE_REPO: Boolean(env.GITHUB_TEMPLATE_REPO),
		GITHUB_TOKEN: Boolean(env.GITHUB_TOKEN),
		ANTHROPIC_API_KEY: Boolean(env.ANTHROPIC_API_KEY),
		STRIPE_RESTRICTED_KEY: Boolean(env.STRIPE_RESTRICTED_KEY),
		WORKSPACE_KEY_SECRET: Boolean(secret),
		PAYMENT_LINK: trialOnSale(),
	};

	const warnings: string[] = [];
	if (secret && secret.length < MIN_SECRET_LENGTH) warnings.push(`WORKSPACE_KEY_SECRET is shorter than ${MIN_SECRET_LENGTH} characters`);
	if (trialOnSale() && /^https:\/\/buy\.stripe\.com\/test_/.test(TRIAL.link)) warnings.push("the payment link is a TEST link: no real payment can be made");
	if (env.STRIPE_RESTRICTED_KEY.startsWith("rk_test_")) warnings.push("the processor key is a TEST key");

	return {
		trial: Object.values(settings).every(Boolean) ? "open" : "paused",
		settings,
		warnings,
		alwaysAvailable: ["the home page", "/how-it-works", "the example workspace", "the legal pages"],
	};
}

export const GET: APIRoute = async () =>
	new Response(JSON.stringify(report(getEnv()), null, 2), {
		status: 200,
		headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
	});
