// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Taking a workspace home — download, clone with git, transfer. Decided
// 2026-10-04: a workspace must be downloadable by anyone with the link and
// reachable with git for the client's technical people. The example can be
// downloaded and nothing else; a real workspace needs its key for all three.
import { afterEach, describe, expect, it, vi } from "vitest";
import { env as workerEnv } from "cloudflare:workers";
import { GET as download } from "@/pages/api/workspace/[slug]/download";
import { POST as invite } from "@/pages/api/workspace/[slug]/invite";
import { POST as transfer } from "@/pages/api/workspace/[slug]/transfer";
import { signWorkspaceKey } from "@/lib/token";
import { WORKSPACE_TOPIC } from "@/lib/workspace-marker";
import { DEMO_FILES, DEMO_WORKSPACE_SLUG } from "@/lib/demo";
import { crc32, makeZip } from "@/lib/zip";
import { GITHUB_USERNAME_RE, readUsername } from "@/lib/take-home";

const SECRET = "wks_test_secret";
const FULL = { GITHUB_ORG: "org", GITHUB_TOKEN: "ghp_x", WORKSPACE_KEY_SECRET: SECRET };

function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}

interface Call {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: unknown;
}

/** A GitHub double: one marked workspace `acme`, and whatever `routes` adds. */
function github(routes: (c: Call) => Response | undefined) {
	const calls: Call[] = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
		const headers: Record<string, string> = {};
		new Headers(init?.headers ?? (input instanceof Request ? input.headers : {})).forEach((v, k) => (headers[k.toLowerCase()] = v));
		const body = init?.body ? JSON.parse(String(init.body)) : null;
		const call = { method: init?.method ?? "GET", url, headers, body };
		calls.push(call);
		const own = routes(call);
		if (own) return own;
		if (/\/repos\/org\/acme$/.test(url)) return new Response(JSON.stringify({ name: "acme", topics: [WORKSPACE_TOPIC] }), { status: 200, headers: { "content-type": "application/json" } });
		return new Response(JSON.stringify({ message: "Not Found" }), { status: 404, headers: { "content-type": "application/json" } });
	});
	return calls;
}

function reply(body: unknown, status: number) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function get(slug: string, key?: string) {
	const url = new URL(`http://nwos.test/api/workspace/${slug}/download`);
	if (key) url.searchParams.set("key", key);
	return download({ params: { slug }, url } as never);
}

async function post(route: typeof invite, slug: string, body: unknown, key?: string) {
	const url = new URL(`http://nwos.test/api/workspace/${slug}/x`);
	if (key) url.searchParams.set("key", key);
	const request = new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
	const response = await route({ params: { slug }, url, request } as never);
	return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

afterEach(() => {
	setEnv();
	vi.restoreAllMocks();
});

describe("the zip writer", () => {
	it("computes the standard CRC-32", () => {
		expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
	});

	it("writes a readable archive: local headers, central directory, end record, entry count", () => {
		const zip = makeZip([
			{ path: "a/README.md", content: "# a" },
			{ path: "b.md", content: "b" },
		]);
		const sig = (at: number) => String.fromCharCode(...zip.slice(at, at + 4));
		expect(sig(0)).toBe("PK\u0003\u0004");
		const end = zip.length - 22;
		expect(sig(end)).toBe("PK\u0005\u0006");
		const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
		expect(view.getUint16(end + 10, true)).toBe(2);
		const centralOffset = view.getUint32(end + 16, true);
		expect(sig(centralOffset)).toBe("PK\u0001\u0002");
	});
});

describe("GET /api/workspace/[slug]/download", () => {
	it("the example is zipped from this site: no key, no network, every file inside", async () => {
		setEnv();
		const calls = github(() => undefined);
		const r = await get(DEMO_WORKSPACE_SLUG);
		expect(r.status).toBe(200);
		expect(r.headers.get("Content-Type")).toBe("application/zip");
		expect(r.headers.get("Content-Disposition")).toBe(`attachment; filename="${DEMO_WORKSPACE_SLUG}.zip"`);
		const bytes = new Uint8Array(await r.arrayBuffer());
		expect(String.fromCharCode(...bytes.slice(0, 2))).toBe("PK");
		const text = new TextDecoder().decode(bytes);
		for (const path of Object.keys(DEMO_FILES)) expect(text).toContain(`${DEMO_WORKSPACE_SLUG}/${path}`);
		expect(calls).toEqual([]);
	});

	it("a real workspace needs its key", async () => {
		setEnv(FULL);
		github(() => undefined);
		expect((await get("acme")).status).toBe(403);
	});

	it("a real workspace is GitHub's archive, fetched in two steps so the token never reaches the second host", async () => {
		setEnv(FULL);
		const calls = github((c) => {
			if (c.url.endsWith("/repos/org/acme/zipball/main")) return new Response(null, { status: 302, headers: { location: "https://codeload.github.com/org/acme/legacy.zip/main?token=tmp" } });
			if (c.url.startsWith("https://codeload.github.com/")) return new Response("PKzipbytes", { status: 200 });
			return undefined;
		});
		const r = await get("acme", await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(200);
		expect(await r.text()).toBe("PKzipbytes");
		const first = calls.find((c) => c.url.endsWith("/zipball/main"))!;
		const second = calls.find((c) => c.url.startsWith("https://codeload.github.com/"))!;
		expect(first.headers.authorization).toBe("Bearer ghp_x");
		expect(second.headers.authorization).toBeUndefined();
	});

	it("when GitHub hands over no archive, the answer says so and names nobody's key", async () => {
		setEnv(FULL);
		github((c) => (c.url.endsWith("/zipball/main") ? reply({ message: "boom" }, 500) : undefined));
		const r = await get("acme", await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(502);
		expect(await r.text()).toMatch(/did not hand over/);
	});
});

describe("GitHub usernames", () => {
	it("accepts GitHub's shape and strips a leading @", () => {
		expect(readUsername({ username: "@octocat" })).toBe("octocat");
		expect(readUsername({ username: " my-org-1 " })).toBe("my-org-1");
		for (const bad of ["", "-x", "x-", "a--b", "has space", "x".repeat(40), 7]) expect(readUsername({ username: bad })).toBeNull();
		expect(GITHUB_USERNAME_RE.test("a".repeat(39))).toBe(true);
	});
});

describe("POST /api/workspace/[slug]/invite", () => {
	it("the example cannot be taken home", async () => {
		setEnv(FULL);
		const calls = github(() => undefined);
		const r = await post(invite, DEMO_WORKSPACE_SLUG, { username: "octocat" });
		expect(r.status).toBe(409);
		expect(r.json.error).toMatch(/belongs to everyone/);
		expect(calls).toEqual([]);
	});

	it("needs the key, like every read", async () => {
		setEnv(FULL);
		github(() => undefined);
		expect((await post(invite, "acme", { username: "octocat" })).status).toBe(403);
	});

	it("refuses a username GitHub would refuse, before asking GitHub", async () => {
		setEnv(FULL);
		const calls = github(() => undefined);
		const r = await post(invite, "acme", { username: "not a user" }, await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(400);
		expect(calls).toEqual([]);
	});

	it("invites the user with write access and hands back the clone address", async () => {
		setEnv(FULL);
		const calls = github((c) => (c.url.endsWith("/repos/org/acme/collaborators/octocat") ? reply({ id: 1 }, 201) : undefined));
		const r = await post(invite, "acme", { username: "octocat" }, await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(200);
		expect(r.json).toMatchObject({ invited: "octocat", already: false, clone: "https://github.com/org/acme.git" });
		const put = calls.find((c) => c.method === "PUT")!;
		expect(put.body).toMatchObject({ permission: "push" });
	});

	it("an unknown user is said plainly", async () => {
		setEnv(FULL);
		github((c) => (c.url.includes("/collaborators/") ? reply({ message: "Not Found" }, 404) : undefined));
		const r = await post(invite, "acme", { username: "nobody-here-404" }, await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(400);
		expect(r.json.error).toMatch(/does not know a user/);
	});
});

describe("POST /api/workspace/[slug]/transfer", () => {
	it("the example cannot be transferred", async () => {
		setEnv(FULL);
		const r = await post(transfer, DEMO_WORKSPACE_SLUG, { username: "octocat" });
		expect(r.status).toBe(409);
	});

	it("asks GitHub to move the repository to the user, who accepts by email", async () => {
		setEnv(FULL);
		const calls = github((c) => (c.url.endsWith("/repos/org/acme/transfer") ? reply({ name: "acme" }, 202) : undefined));
		const r = await post(transfer, "acme", { username: "octocat" }, await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(200);
		expect(r.json).toMatchObject({ to: "octocat", state: "pending" });
		expect(calls.find((c) => c.url.endsWith("/transfer"))!.body).toMatchObject({ new_owner: "octocat" });
	});

	it("a refusal by GitHub changes nothing and says what to do", async () => {
		setEnv(FULL);
		github((c) => (c.url.endsWith("/transfer") ? reply({ message: "Validation Failed" }, 422) : undefined));
		const r = await post(transfer, "acme", { username: "octocat" }, await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(409);
		expect(r.json.error).toMatch(/Nothing changed/);
	});

	it("a malformed body is a 400, not a crash", async () => {
		setEnv(FULL);
		github(() => undefined);
		const r = await post(transfer, "acme", "{", await signWorkspaceKey("acme", SECRET));
		expect(r.status).toBe(400);
	});
});
