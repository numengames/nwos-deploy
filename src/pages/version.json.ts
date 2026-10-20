// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// /version.json — the build's identity stamp.
//
// WHY THIS EXISTS. Without it there is no way to tell, from outside, which
// commit a domain is actually serving. numinia.org served a stale build for
// eight days after a silent Workers Builds disconnection and nothing raised
// it (correction note in numinia-nwos/web/wrangler.toml, 2026-08-25). With
// the stamp:
//
//   curl -s https://nwos.numen.games/version.json | jq -r .commit
//
// answers in a second and gets compared against main's HEAD. Same contract
// as numen.games and numinia.com (src/pages/version.json.ts in
// numengames-web; sealed in the deploy workflow on numinia-web).
//
// The SHA is injected by Workers Builds as WORKERS_CI_COMMIT_SHA. Locally it
// does not exist and the value is "local": that is exactly what would give
// away a hand-made deploy from a laptop instead of one from CI.
//
// Implementation note: this must be an endpoint (.ts), not an .astro page.
// With build.format "directory" — this project's setting — a page named
// version.json.astro would emit dist/version.json/index.html, a directory,
// and the URL /version.json would not return JSON.
export const prerender = true;

export function GET() {
	// Same lookup as src/lib/build-info.ts: the Cloudflare adapter's build
	// does not forward an arbitrary host `process.env` into this route the
	// way a plain Vite/Node build does (verified locally: `process.env`
	// alone stayed "local" even with the variable exported, while
	// `import.meta.env` picked it up) — check `import.meta.env` first.
	const sha = import.meta.env.WORKERS_CI_COMMIT_SHA || process.env.WORKERS_CI_COMMIT_SHA;
	const commit = sha || "local";
	const body = JSON.stringify({
		commit,
		builtAt: new Date().toISOString(),
	});

	return new Response(body, {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			// Verified with `wrangler dev`: Cloudflare's asset server
			// overwrites this header with
			// "public, max-age=0, must-revalidate". The intended effect
			// still holds — revalidated on every request, never a stale
			// copy served — but this is not the value that reaches the
			// client.
			"Cache-Control": "no-store",
		},
	});
}
