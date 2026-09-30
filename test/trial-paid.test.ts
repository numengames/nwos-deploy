// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// POST /api/registro with the trial ON sale: the two steps before the model.
// The record is doubled with a payment link; GitHub and Stripe answer
// through a fetch double. The one thing these tests hold is that no request
// reaches Anthropic or creates a repository until Stripe says "paid".
import { afterEach, describe, expect, it, vi } from "vitest";
import { env as workerEnv } from "cloudflare:workers";

vi.mock("@/data/trial", async (orig) => {
	const real = await orig<typeof import("@/data/trial")>();
	const TRIAL = { ...real.TRIAL, link: "https://buy.stripe.com/test_abc" };
	return { ...real, TRIAL, trialOnSale: () => true };
});

const { POST } = await import("@/pages/api/registro");
const { encodeReference } = await import("@/data/trial");

const FULL = { GITHUB_ORG: "org", GITHUB_TOKEN: "ghp_x", GITHUB_TEMPLATE_REPO: "tpl", ANTHROPIC_API_KEY: "sk-ant-x", STRIPE_RESTRICTED_KEY: "rk_x" };
const valid = { companyName: "Acme, S.L.", email: "ana@acme.example", acceptedTerms: true };
const SID = "cs_test_a1B2c3D4e5F6g7H8";

function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}

/** fetch double: answers by URL; records every URL asked. */
function network(opts: { repoExists: boolean; session?: Record<string, unknown> }) {
	const calls: string[] = [];
	const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
		calls.push(url);
		const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
		if (url.startsWith("https://api.stripe.com/")) return reply(opts.session ?? {}, opts.session ? 200 : 404);
		if (/api\.github\.com\/repos\/org\/acme-s-l$/.test(url)) return opts.repoExists ? reply({ name: "acme-s-l" }) : reply({ message: "Not Found" }, 404);
		return reply({ message: "unexpected in this test" }, 418);
	});
	return { calls, spy };
}

async function post(body: unknown) {
	const request = new Request("http://nwos.test/api/registro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	const response = await POST({ request } as never);
	return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

const paid = { id: SID, status: "complete", payment_status: "paid", amount_total: 2900, currency: "eur", client_reference_id: encodeReference("Acme, S.L."), customer_details: { email: "ana@acme.example" } };
const neverModelOrCreate = (calls: string[]) => {
	expect(calls.some((u) => u.includes("anthropic.com"))).toBe(false);
	expect(calls.some((u) => u.includes("/generate"))).toBe(false);
};

afterEach(() => {
	setEnv();
	vi.restoreAllMocks();
});

describe("step 1 — no payment yet", () => {
	it("a free name → 402 with the payment URL, carrying the email and the organisation", async () => {
		setEnv(FULL);
		const { calls } = network({ repoExists: false });
		const r = await post(valid);
		expect(r.status).toBe(402);
		const url = new URL(String(r.json.payUrl));
		expect(url.host).toBe("buy.stripe.com");
		expect(url.searchParams.get("client_reference_id")).toBe(encodeReference("Acme, S.L."));
		expect(url.searchParams.get("prefilled_email")).toBe("ana@acme.example");
		neverModelOrCreate(calls);
	});

	it("a name already taken → 422 before anyone pays", async () => {
		setEnv(FULL);
		const { calls } = network({ repoExists: true });
		const r = await post(valid);
		expect(r.status).toBe(422);
		expect(r.json.payUrl).toBeUndefined();
		neverModelOrCreate(calls);
	});
});

describe("step 2 — back from the processor", () => {
	it("a session the processor does not know → 402, nothing created", async () => {
		setEnv(FULL);
		const { calls } = network({ repoExists: false });
		const r = await post({ sessionId: SID });
		expect(r.status).toBe(402);
		expect(r.json.success).toBeUndefined();
		neverModelOrCreate(calls);
	});

	it("an unpaid session → 402, nothing created", async () => {
		setEnv(FULL);
		const { calls } = network({ repoExists: false, session: { ...paid, payment_status: "unpaid" } });
		const r = await post({ sessionId: SID });
		expect(r.status).toBe(402);
		neverModelOrCreate(calls);
	});

	it("the workspace is the one PAID for: a name sent by the browser beside the session is ignored", async () => {
		setEnv(FULL);
		const { calls } = network({ repoExists: true, session: paid });
		const r = await post({ companyName: "Someone Else", email: "x@y.example", acceptedTerms: true, sessionId: SID });
		expect(r.json.slug).toBe("acme-s-l");
		neverModelOrCreate(calls);
	});

	it("the same payment again (a reload) → the workspace already made, the model not paid twice", async () => {
		setEnv(FULL);
		const { calls } = network({ repoExists: true, session: paid });
		const r = await post({ sessionId: SID });
		expect(r.status).toBe(200);
		expect(r.json).toMatchObject({ success: true, slug: "acme-s-l", existing: true });
		expect(typeof r.json.accessKey).toBe("string");
		neverModelOrCreate(calls);
	});
});
