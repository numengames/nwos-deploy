// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// GET /api/workspace/[slug]/tree and /file — the viewer's two reads.
//
// Audit 2026-10-02: a valid access key is an HMAC of the slug, and the
// routes read with a token that sees EVERY repository in the organisation.
// A key must therefore open only a repository that the deploy flow marked
// as a workspace (topic `nwos-workspace`), never any other repo in the org.
// The public demo is served without a key and without the marker. Every
// answer carries `Cache-Control: no-store` and `Referrer-Policy:
// no-referrer`: the key travels in the query string.
import { afterEach, describe, expect, it, vi } from "vitest";
import { env as workerEnv } from "cloudflare:workers";
import { GET as tree } from "@/pages/api/workspace/[slug]/tree";
import { GET as file } from "@/pages/api/workspace/[slug]/file";
import { signWorkspaceKey } from "@/lib/token";
import { WORKSPACE_TOPIC } from "@/lib/workspace-marker";

const SECRET = "wks_test_secret";
const FULL = { GITHUB_ORG: "org", GITHUB_TOKEN: "ghp_x", WORKSPACE_KEY_SECRET: SECRET };

function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}

/** fetch double: one repository per slug, with the topics given. */
function github(repos: Record<string, string[]>) {
	const calls: string[] = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
		calls.push(url.pathname);
		const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
		const m = /^\/repos\/org\/([^/]+)(\/.*)?$/.exec(url.pathname);
		if (!m || !(m[1]! in repos)) return reply({ message: "Not Found" }, 404);
		const rest = m[2] ?? "";
		if (rest === "") return reply({ name: m[1], topics: repos[m[1]!] });
		if (rest.startsWith("/git/trees/")) return reply({ tree: [{ path: "README.md", type: "blob" }], truncated: false });
		if (rest.startsWith("/contents/")) return reply({ name: "README.md", path: "README.md", content: Buffer.from("# secret").toString("base64") });
		return reply({ message: "unexpected" }, 418);
	});
	return calls;
}

async function call(route: typeof tree, slug: string, query: Record<string, string>) {
	const url = new URL(`http://nwos.test/api/workspace/${slug}/x`);
	for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
	const response = await route({ params: { slug }, url } as never);
	return { status: response.status, headers: response.headers, json: (await response.json()) as Record<string, unknown> };
}

afterEach(() => {
	setEnv();
	vi.restoreAllMocks();
});

describe.each([
	["tree", tree, {}],
	["file", file, { path: "README.md" }],
])("/api/workspace/[slug]/%s", (_name, route, extra) => {
	it("a valid key to a repository that is NOT a workspace → 404, its contents never read", async () => {
		setEnv(FULL);
		const calls = github({ "private-tooling": [] });
		const key = await signWorkspaceKey("private-tooling", SECRET);
		const r = await call(route, "private-tooling", { ...extra, key });
		expect(r.status).toBe(404);
		expect(JSON.stringify(r.json)).not.toContain("secret");
		expect(calls.some((p) => p.includes("/git/trees/") || p.includes("/contents/"))).toBe(false);
	});

	it("a valid key to a marked workspace → 200", async () => {
		setEnv(FULL);
		github({ acme: [WORKSPACE_TOPIC] });
		const key = await signWorkspaceKey("acme", SECRET);
		const r = await call(route, "acme", { ...extra, key });
		expect(r.status).toBe(200);
	});

	it("a marked workspace without the key → 403", async () => {
		setEnv(FULL);
		github({ acme: [WORKSPACE_TOPIC] });
		const r = await call(route, "acme", { ...extra });
		expect(r.status).toBe(403);
	});

	it("the public demo is served without a key and without the marker", async () => {
		setEnv(FULL);
		github({ "faro-austral": [] });
		const r = await call(route, "faro-austral", { ...extra });
		expect(r.status).toBe(200);
	});

	it("a key signed with the GITHUB_TOKEN (the old fallback) opens nothing", async () => {
		setEnv(FULL);
		github({ acme: [WORKSPACE_TOPIC] });
		const key = await signWorkspaceKey("acme", "ghp_x");
		const r = await call(route, "acme", { ...extra, key });
		expect(r.status).toBe(403);
	});

	it("no WORKSPACE_KEY_SECRET → 500 'Missing configuration: WORKSPACE_KEY_SECRET', even with a GITHUB_TOKEN", async () => {
		setEnv({ GITHUB_ORG: "org", GITHUB_TOKEN: "ghp_x" });
		const calls = github({ acme: [WORKSPACE_TOPIC] });
		const key = await signWorkspaceKey("acme", "ghp_x");
		const r = await call(route, "acme", { ...extra, key });
		expect(r.status).toBe(500);
		expect(r.json.error).toBe("Missing configuration: WORKSPACE_KEY_SECRET");
		expect(calls).toEqual([]);
	});

	it("every answer is no-store and no-referrer (the key is in the URL)", async () => {
		setEnv(FULL);
		github({ acme: [WORKSPACE_TOPIC] });
		const key = await signWorkspaceKey("acme", SECRET);
		for (const q of [{ ...extra, key }, { ...extra }, { ...extra, key: "bad" }]) {
			const r = await call(route, "acme", q);
			expect(r.headers.get("Cache-Control")).toBe("no-store");
			expect(r.headers.get("Referrer-Policy")).toBe("no-referrer");
		}
	});
});
