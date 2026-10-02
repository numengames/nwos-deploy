// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Security headers on every response the Worker renders (src/middleware.ts),
// and the same set for the static files Cloudflare serves without the Worker
// (public/_headers). Audit 2026-10-02: none were set.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CSP, securityHeaders, onRequest } from "@/middleware";

describe("securityHeaders", () => {
	it("the baseline on every page", () => {
		const h = securityHeaders("/");
		expect(h["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
		expect(h["X-Content-Type-Options"]).toBe("nosniff");
		expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
		expect(h["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
		expect(h["X-Frame-Options"]).toBe("DENY");
		expect(h["Content-Security-Policy"]).toBe(CSP);
	});

	it("the CSP closes framing, plugins, base and foreign form targets", () => {
		for (const d of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "connect-src 'self'"]) {
			expect(CSP).toContain(d);
		}
	});

	it.each(["/workspace/acme", "/workspace/faro-austral", "/api/workspace/acme/tree", "/api/workspace/acme/file"])("%s carries the key in its URL → no-referrer", (path) => {
		expect(securityHeaders(path)["Referrer-Policy"]).toBe("no-referrer");
	});

	it("API answers are never cached", () => {
		expect(securityHeaders("/api/registro")["Cache-Control"]).toBe("no-store");
		expect(securityHeaders("/")["Cache-Control"]).toBeUndefined();
	});
});

describe("onRequest", () => {
	const ctx = (url: string) => ({ url: new URL(url), request: new Request(url) }) as never;

	it("adds the headers to what the route returned", async () => {
		const res = (await onRequest(ctx("https://nwos.numen.games/velo"), async () => new Response("ok", { headers: { "Content-Type": "text/html" } }))) as Response;
		expect(res.headers.get("X-Frame-Options")).toBe("DENY");
		expect(res.headers.get("Content-Type")).toBe("text/html");
	});

	it("plain http on the production host → 301 to https, the route never runs", async () => {
		let ran = false;
		const res = (await onRequest(ctx("http://nwos.numen.games/velo?x=1"), async () => {
			ran = true;
			return new Response("ok");
		})) as Response;
		expect(res.status).toBe(301);
		expect(res.headers.get("Location")).toBe("https://nwos.numen.games/velo?x=1");
		expect(ran).toBe(false);
	});

	it("http on localhost (wrangler dev) is left alone", async () => {
		const res = (await onRequest(ctx("http://localhost:8787/velo"), async () => new Response("ok"))) as Response;
		expect(res.status).toBe(200);
	});
});

describe("public/_headers (static files bypass the Worker)", () => {
	const file = readFileSync("public/_headers", "utf8");

	it("sets the same baseline and CSP for every path", () => {
		expect(file).toMatch(/^\/\*$/m);
		for (const [name, value] of Object.entries(securityHeaders("/"))) {
			expect(file).toContain(`${name}: ${value}`);
		}
	});

	it("workspace pages get no-referrer", () => {
		expect(file).toMatch(/^\/workspace\/\*\n\s+Referrer-Policy: no-referrer$/m);
	});
});

describe("security.txt", () => {
	const txt = readFileSync("public/.well-known/security.txt", "utf8");

	it("points at private vulnerability reporting first and has not expired", () => {
		const contacts = [...txt.matchAll(/^Contact: (.+)$/gm)].map((m) => m[1]);
		expect(contacts[0]).toBe("https://github.com/numengames/nwos-deploy/security/advisories/new");
		const expires = /^Expires: (.+)$/m.exec(txt)?.[1];
		expect(new Date(expires!).getTime()).toBeGreaterThan(Date.now());
		expect(txt).toMatch(/^Policy: https:\/\/github\.com\/numengames\/nwos-deploy\/blob\/main\/SECURITY\.md$/m);
	});
});
