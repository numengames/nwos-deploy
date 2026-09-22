// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// POST /api/registro — the gate before anything touches GitHub.
//
// registro.ts creates a client's workspace: a repository generated from the
// mould, personalised, licensed, populated by an agent. Measured 2026-09-19:
// 467 lines, 6 % covered — only `sanitize` had a test. These tests
// characterise the part that runs BEFORE the first network call: what the
// route refuses, with which status and which message, and that a refused
// request never reaches GitHub or Anthropic. They are the floor the next cut
// (a seam for the GitHub client, so the deploy itself can be driven with a
// double) stands on.
//
// Characterisation, not red-green: the behaviour exists, so these pass on
// the first run. Each one was checked to bite by breaking the rule it pins
// and watching it fail (see the pull request).
import { describe, expect, it, vi } from "vitest";
import { POST } from "@/pages/api/registro";
import { env as workerEnv } from "cloudflare:workers";

/* The body the deploy form posts, valid unless a field is overridden. */
const valid = { companyName: "Acme, S.L.", email: "ana@acme.example", acceptedTerms: true };

/* What getEnv reads: the `env` binding of `cloudflare:workers`. Empty means
   the server is misconfigured, which the route must say before any request
   leaves. Injected through the module double (vitest.config.ts) because the
   adapter stopped exposing the secrets through `locals` — see
   src/lib/env.ts. */
function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}

async function post(body: unknown, env?: Record<string, string>) {
	const request = new Request("http://nwos.test/api/registro", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
	setEnv(env);
	const response = await POST({ request } as never);
	return { status: response.status, json: (await response.json()) as { error?: string; success?: boolean } };
}

describe("POST /api/registro refuses before touching the network", () => {
	it("a body that is not JSON → 400", async () => {
		const r = await post("{not json");
		expect(r.status).toBe(400);
		expect(r.json.error).toBe("Cuerpo de la petición no válido");
	});

	it.each([
		["companyName", { ...valid, companyName: "" }],
		["email", { ...valid, email: "   " }],
		["acceptedTerms false", { ...valid, acceptedTerms: false }],
		["acceptedTerms as a string", { ...valid, acceptedTerms: "true" }],
	])("a missing field (%s) → 400, every field is required", async (_what, body) => {
		const r = await post(body);
		expect(r.status).toBe(400);
		expect(r.json.error).toBe("Todos los campos son obligatorios");
	});

	it.each([
		["a double quote", 'Acme "the" Corp'],
		["a backtick", "Acme `corp`"],
		["braces", "Acme {{x}}"],
		["a newline", "Acme\nCorp"],
		["one character", "A"],
		["61 characters", "A".repeat(61)],
		["leading punctuation", "-Acme"],
	])("a company name with %s → 400: it is interpolated into prompts and committed content", async (_what, companyName) => {
		const r = await post({ ...valid, companyName });
		expect(r.status).toBe(400);
		expect(r.json.error).toMatch(/^Nombre de organización no válido/);
	});

	it.each([["Acme, S.L."], ["Numen Games S.L."], ["Éxito & Cía (Norte) + Sur"], ["東京 Corp"]])("a company name like %s passes the name rule", async (companyName) => {
		const r = await post({ ...valid, companyName });
		expect(r.json.error).not.toMatch(/^Nombre de organización/);
	});

	it.each([["no-at.example"], ["a@b"], ["a b@c.de"], [`${"a".repeat(65)}@c.de`], [`a@${"b".repeat(250)}.de`]])("an email like %s → 400", async (email) => {
		const r = await post({ ...valid, email });
		expect(r.status).toBe(400);
		expect(r.json.error).toBe("Email no válido");
	});

	it("a name whose slug has fewer than 2 alphanumerics → 400 (it would be the repository's name)", async () => {
		const r = await post({ ...valid, companyName: "É.É" });
		expect(r.status).toBe(400);
		expect(r.json.error).toMatch(/al menos 2 caracteres alfanuméricos/);
	});

	it("a valid request on a server missing its configuration → 500, and the client is told nothing about which key", async () => {
		const r = await post(valid, { GITHUB_ORG: "numengames" });
		expect(r.status).toBe(500);
		expect(r.json.error).toBe("Configuración del servidor incompleta");
		expect(JSON.stringify(r.json)).not.toMatch(/GITHUB_TOKEN|ANTHROPIC|TEMPLATE/);
	});

	it("every refusal is JSON and never a success", async () => {
		for (const body of ["{", { ...valid, email: "x" }, { ...valid, companyName: "A" }]) {
			const r = await post(body);
			expect(r.status).toBeGreaterThanOrEqual(400);
			expect(r.json.success).toBeUndefined();
			expect(typeof r.json.error).toBe("string");
		}
	});

	it("a refused request makes no call to GitHub or Anthropic", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		try {
			await post({ ...valid, companyName: "A" });
			await post("{", {});
			await post(valid, {});
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
