// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The public example and the health report — the two things that must work
// when NOTHING is configured.
//
// QA 2026-10-03 found both calls to action of the home page dead for the
// same reason: a missing secret. The example is now served from this
// repository, and the reason a trial is paused is answered by /api/health
// without printing any value.
import { afterEach, describe, expect, it, vi } from "vitest";
import { env as workerEnv } from "cloudflare:workers";
import { GET as tree } from "@/pages/api/workspace/[slug]/tree";
import { GET as file } from "@/pages/api/workspace/[slug]/file";
import { GET as health, report } from "@/pages/api/health";
import { DEMO_FILES, DEMO_WORKSPACE_SLUG, demoTree } from "@/lib/demo";

function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}

async function call(route: typeof tree, slug: string, query: Record<string, string> = {}) {
	const url = new URL(`http://nwos.test/api/workspace/${slug}/x`);
	for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
	const response = await route({ params: { slug }, url } as never);
	return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

afterEach(() => {
	setEnv();
	vi.restoreAllMocks();
});

describe("the public example", () => {
	it("carries the four founding documents and a status file", () => {
		const paths = Object.keys(DEMO_FILES);
		for (const p of ["STATUS.md", "README.md", "canon/C-001-mission-vision-values.md", "canon/C-002-culture.md", "canon/C-003-org-structure.md", "canon/C-004-glossary.md"]) {
			expect(paths).toContain(p);
		}
	});

	it("says it is invented, so no visitor reads it as a client's", () => {
		expect(DEMO_FILES["README.md"]).toMatch(/invented organisation/i);
		expect(DEMO_FILES["STATUS.md"]).toMatch(/invented/i);
	});

	it("keeps the NEEDS REVIEW marks the trial promises", () => {
		expect(DEMO_FILES["canon/C-001-mission-vision-values.md"]).toContain("NEEDS REVIEW");
	});

	it("opens with NO environment at all, no key and no network", async () => {
		setEnv();
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const t = await call(tree, DEMO_WORKSPACE_SLUG);
		expect(t.status).toBe(200);
		expect(Array.isArray(t.json.tree)).toBe(true);
		const f = await call(file, DEMO_WORKSPACE_SLUG, { path: "canon/C-004-glossary.md" });
		expect(f.status).toBe(200);
		expect(String(f.json.content)).toContain("Glossary");
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("serves only what it holds: an unknown path is 404, and ../ is refused", async () => {
		setEnv();
		expect((await call(file, DEMO_WORKSPACE_SLUG, { path: "secrets.md" })).status).toBe(404);
		expect((await call(file, DEMO_WORKSPACE_SLUG, { path: "../../etc/passwd" })).status).toBe(400);
	});

	it("its tree nests folders the way the viewer expects", () => {
		const canon = demoTree().find((n) => n.name === "canon");
		expect(canon?.type).toBe("dir");
		expect(canon?.children?.length).toBe(4);
		expect(canon?.children?.[0]?.path).toMatch(/^canon\//);
	});
});

describe("/api/health", () => {
	it("with nothing configured: the trial is paused and every setting is named as absent", async () => {
		setEnv();
		const r = await health({} as never);
		expect(r.status).toBe(200);
		const body = (await r.json()) as ReturnType<typeof report>;
		expect(body.trial).toBe("paused");
		for (const key of ["GITHUB_ORG", "GITHUB_TEMPLATE_REPO", "GITHUB_TOKEN", "ANTHROPIC_API_KEY", "STRIPE_RESTRICTED_KEY", "WORKSPACE_KEY_SECRET"]) {
			expect(body.settings[key]).toBe(false);
		}
		expect(body.alwaysAvailable.join(" ")).toMatch(/example/);
	});

	it("never prints a value, not even part of one", async () => {
		const secrets = {
			GITHUB_ORG: "numen-games-nwos-orgs",
			GITHUB_TEMPLATE_REPO: "nwos-workspace-template",
			GITHUB_TOKEN: "ghp_notARealToken000000",
			ANTHROPIC_API_KEY: "sk-ant-notARealKey000000",
			STRIPE_RESTRICTED_KEY: "rk_test_notARealKey000000",
			WORKSPACE_KEY_SECRET: "0123456789abcdef0123456789abcdef",
		};
		setEnv(secrets);
		const text = await (await health({} as never)).text();
		for (const value of Object.values(secrets)) {
			expect(text).not.toContain(value);
			expect(text).not.toContain(value.slice(0, 8));
		}
	});

	it("warns when the processor is in test mode", async () => {
		setEnv({ STRIPE_RESTRICTED_KEY: "rk_test_x" });
		const body = report({ GITHUB_ORG: "", GITHUB_TOKEN: "", GITHUB_TEMPLATE_REPO: "", ANTHROPIC_API_KEY: "", STRIPE_RESTRICTED_KEY: "rk_test_x", WORKSPACE_KEY_SECRET: undefined });
		expect(body.warnings.join(" ")).toMatch(/TEST key/);
	});

	it("warns when the signing secret is too short to be one", () => {
		const body = report({ GITHUB_ORG: "", GITHUB_TOKEN: "", GITHUB_TEMPLATE_REPO: "", ANTHROPIC_API_KEY: "", STRIPE_RESTRICTED_KEY: "", WORKSPACE_KEY_SECRET: "short" });
		expect(body.warnings.join(" ")).toMatch(/WORKSPACE_KEY_SECRET/);
	});
});
