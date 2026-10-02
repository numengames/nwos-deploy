// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Security headers on every response the Worker renders (audit 2026-10-02:
// none were set). The prerendered pages are files Cloudflare serves without
// running the Worker, so public/_headers carries the same set for them; a
// test keeps the two in step (test/security-headers.test.ts).
//
// The CSP is what the build actually needs, inventoried on 2026-10-02:
// inline <script> blocks (theme, navigation, cookie notice) and inline
// style attributes, self-hosted fonts, no third-party script, no external
// fetch. Stripe is reached by navigating to buy.stripe.com, which CSP does
// not govern (no form posts there), so it needs no entry.
//
// The workspace viewer carries its access key in the query string: its
// pages and the API answer with `Referrer-Policy: no-referrer`, and API
// answers are never cached.
import type { MiddlewareHandler } from "astro";

export const CSP = ["default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https:", "font-src 'self' data:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join("; ");

const PRODUCTION_HOST = "nwos.numen.games";

export function securityHeaders(pathname: string): Record<string, string> {
	const keyInUrl = pathname.startsWith("/workspace/") || pathname.startsWith("/api/workspace/");
	const headers: Record<string, string> = {
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": keyInUrl ? "no-referrer" : "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
		"X-Frame-Options": "DENY",
		"Content-Security-Policy": CSP,
	};
	if (pathname.startsWith("/api/")) headers["Cache-Control"] = "no-store";
	return headers;
}

export const onRequest: MiddlewareHandler = async (context, next) => {
	const { url } = context;
	if (url.protocol === "http:" && url.hostname === PRODUCTION_HOST) {
		return new Response(null, { status: 301, headers: { Location: `https://${url.host}${url.pathname}${url.search}` } });
	}

	const response = await next();
	const extra = securityHeaders(url.pathname);
	try {
		for (const [name, value] of Object.entries(extra)) response.headers.set(name, value);
		return response;
	} catch {
		// Immutable headers (a response passed through from fetch): copy.
		const headers = new Headers(response.headers);
		for (const [name, value] of Object.entries(extra)) headers.set(name, value);
		return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
	}
};
