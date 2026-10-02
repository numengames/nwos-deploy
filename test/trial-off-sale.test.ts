// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// POST /api/registro with NO payment link: nothing is on sale, so no deploy
// runs and nobody is called, whatever the server holds. The record is
// doubled with an empty link, the state an Oracle can put it back in.
import { afterEach, describe, expect, it, vi } from "vitest";
import { env as workerEnv } from "cloudflare:workers";

vi.mock("@/data/trial", async (orig) => {
	const real = await orig<typeof import("@/data/trial")>();
	return { ...real, TRIAL: { ...real.TRIAL, link: "" }, trialOnSale: () => false };
});

const SID = "cs_test_a1B2c3D4e5F6g7H8";

/* ── The route, with nothing on sale (the record as it ships) ── */

function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}
const FULL = { GITHUB_ORG: "org", GITHUB_TOKEN: "ghp_x", GITHUB_TEMPLATE_REPO: "tpl", ANTHROPIC_API_KEY: "sk-ant-x", STRIPE_RESTRICTED_KEY: "rk_x", WORKSPACE_KEY_SECRET: "wks_x" };
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
