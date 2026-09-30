// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The paid trial (numinia-archive OPS-015). The model is called only after
// the processor itself says the workspace was paid for; everything before
// that point is pinned here with doubles for Stripe and GitHub.
import { afterEach, describe, expect, it, vi } from "vitest";
import { env as workerEnv } from "cloudflare:workers";
import { TRIAL, trialOnSale, paymentUrl, encodeReference, decodeReference, type Trial } from "@/data/trial";
import { checkPaidSession, SESSION_ID_RE } from "@/lib/payment";

const onSale: Trial = { ...TRIAL, link: "https://buy.stripe.com/test_abc" };
const SID = "cs_test_a1B2c3D4e5F6g7H8";

const REF = encodeReference("Acme, S.L.");
function session(over: Record<string, unknown> = {}) {
	return { id: SID, status: "complete", payment_status: "paid", amount_total: 2900, currency: "eur", client_reference_id: REF, customer_details: { email: "ana@acme.example" }, ...over };
}
const stripeAnswer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("the trial record", () => {
	it("costs 29 EUR with VAT, as OPS-015 says", () => {
		expect(TRIAL.priceEur).toBe(29);
		expect(TRIAL.currency).toBe("eur");
	});
	it("is on sale only with an https payment link", () => {
		expect(trialOnSale({ ...TRIAL, link: "" })).toBe(false);
		expect(trialOnSale({ ...TRIAL, link: "http://buy.stripe.com/x" })).toBe(false);
		expect(trialOnSale(onSale)).toBe(true);
	});
	it("the payment link carries the email and the organisation", () => {
		const url = new URL(paymentUrl(onSale, "ana@acme.example", REF));
		expect(url.origin + url.pathname).toBe("https://buy.stripe.com/test_abc");
		expect(url.searchParams.get("prefilled_email")).toBe("ana@acme.example");
		expect(url.searchParams.get("client_reference_id")).toBe(REF);
	});
	it.each([["Acme, S.L."], ["Éxito & Cía (Norte) + Sur"], ["東京 Corp"]])("the organisation %s survives the trip, in the characters the processor allows", (name) => {
		const ref = encodeReference(name);
		expect(ref).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
		expect(decodeReference(ref)).toBe(name);
	});
	it("a reference that is not ours decodes to nothing", () => {
		expect(decodeReference("")).toBeNull();
		expect(decodeReference("a b")).toBeNull();
		expect(decodeReference("_w")).toBeNull();
	});
});

describe("checkPaidSession asks the processor, never the browser", () => {
	it("a complete, paid session for 29 EUR → ok, with the organisation and the email it carries", async () => {
		const f = stripeAnswer(session());
		expect(await checkPaidSession(SID, onSale, "rk_x", f)).toEqual({ ok: true, companyName: "Acme, S.L.", email: "ana@acme.example" });
		const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
		expect(url).toBe(`https://api.stripe.com/v1/checkout/sessions/${SID}`);
		expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer rk_x" });
	});

	it.each([
		["an open session", { status: "open" }],
		["an unpaid session", { payment_status: "unpaid" }],
		["another amount", { amount_total: 100 }],
		["another currency", { currency: "usd" }],
		["no organisation on it", { client_reference_id: null }],
		["no email on it", { customer_details: null }],
	])("%s → refused", async (_what, over) => {
		const r = await checkPaidSession(SID, onSale, "rk_x", stripeAnswer(session(over)));
		expect(r.ok).toBe(false);
	});

	it("an unknown session → refused; a malformed id never reaches the processor", async () => {
		expect((await checkPaidSession(SID, onSale, "rk_x", stripeAnswer({}, 404))).ok).toBe(false);
		const f = stripeAnswer(session());
		for (const bad of ["", "pi_123", "cs_live_../../x", "cs_test_short"]) {
			expect(SESSION_ID_RE.test(bad)).toBe(false);
			expect((await checkPaidSession(bad, onSale, "rk_x", f)).ok).toBe(false);
		}
		expect(f).not.toHaveBeenCalled();
	});

	it("a processor outage throws rather than saying yes", async () => {
		await expect(checkPaidSession(SID, onSale, "rk_x", stripeAnswer({}, 500))).rejects.toThrow();
	});
});

/* ── The route, with nothing on sale (the record as it ships) ── */

function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}
const FULL = { GITHUB_ORG: "org", GITHUB_TOKEN: "ghp_x", GITHUB_TEMPLATE_REPO: "tpl", ANTHROPIC_API_KEY: "sk-ant-x", STRIPE_RESTRICTED_KEY: "rk_x" };
const valid = { companyName: "Acme, S.L.", email: "ana@acme.example", acceptedTerms: true };

async function post(body: unknown) {
	const { POST } = await import("@/pages/api/registro");
	const request = new Request("http://nwos.test/api/registro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	const response = await POST({ request } as never);
	return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

afterEach(() => {
	setEnv();
	vi.restoreAllMocks();
});

describe("POST /api/registro while the trial is not on sale", () => {
	it("a fully configured server refuses every deploy with 503 and calls nobody", async () => {
		setEnv(FULL);
		const spy = vi.spyOn(globalThis, "fetch");
		const r = await post(valid);
		expect(r.status).toBe(503);
		expect(r.json.error).toBe("The trial is not on sale yet");
		const r2 = await post({ sessionId: SID });
		expect(r2.status).toBe(503);
		expect(spy).not.toHaveBeenCalled();
	});

	it("a server without the processor key is misconfigured → 500, naming no key", async () => {
		setEnv({ ...FULL, STRIPE_RESTRICTED_KEY: "" });
		const r = await post(valid);
		expect(r.status).toBe(500);
		expect(JSON.stringify(r.json)).not.toMatch(/STRIPE/);
	});
});
