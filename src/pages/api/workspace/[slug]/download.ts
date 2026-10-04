// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// GET /api/workspace/[slug]/download?key= — the whole workspace as one
// .zip, for anyone holding the link. No account, no git. A real workspace
// comes from GitHub's own archive of the repository; the public example is
// zipped here from the files this site holds (src/lib/zip.ts).
import type { APIRoute } from "astro";
import { apiJson, workspaceAccess } from "@/lib/workspace-access";
import { DEMO_FILES, isDemoWorkspace } from "@/lib/demo";
import { makeZip } from "@/lib/zip";
import { log, errorMessage } from "@/lib/log";

export const prerender = false;

function zipResponse(body: BodyInit, slug: string): Response {
	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": `attachment; filename="${slug}.zip"`,
			"Cache-Control": "no-store",
			"Referrer-Policy": "no-referrer",
		},
	});
}

export const GET: APIRoute = async ({ params, url }) => {
	if (isDemoWorkspace(params.slug)) {
		const entries = Object.entries(DEMO_FILES).map(([path, content]) => ({ path: `${params.slug}/${path}`, content }));
		return zipResponse(makeZip(entries) as unknown as BodyInit, params.slug!);
	}

	const access = await workspaceAccess(params.slug, url.searchParams.get("key"), "Workspace not found");
	if (!access.ok) return access.response;
	const { org, slug, token } = access;

	try {
		// GitHub answers the archive request with a redirect to a short-lived
		// address that needs no credential. Two explicit steps, so the token
		// never travels to the second host.
		const first = await fetch(`https://api.github.com/repos/${org}/${slug}/zipball/main`, {
			headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "nwos-deploy" },
			redirect: "manual",
		});
		const location = first.headers.get("location");
		if (first.status !== 302 || !location) {
			log.error("download.no_archive", { repo: `${org}/${slug}`, status: first.status });
			return apiJson({ error: "GitHub did not hand over the archive. Try again in a minute, or write to hola@numengames.com." }, 502);
		}
		const archive = await fetch(location, { headers: { "User-Agent": "nwos-deploy" } });
		if (!archive.ok || !archive.body) {
			log.error("download.archive_failed", { repo: `${org}/${slug}`, status: archive.status });
			return apiJson({ error: "GitHub did not hand over the archive. Try again in a minute, or write to hola@numengames.com." }, 502);
		}
		return zipResponse(archive.body, slug);
	} catch (e) {
		log.error("download.failed", { repo: `${org}/${slug}`, error: errorMessage(e) });
		return apiJson({ error: "The download failed on our side. Nothing changed; try again or write to hola@numengames.com." }, 502);
	}
};
