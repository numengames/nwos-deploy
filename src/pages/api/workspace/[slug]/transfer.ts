// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// POST /api/workspace/[slug]/transfer?key=  { username } — move the
// repository to the client's GitHub account. GitHub emails the new owner,
// who accepts within a day; the house then holds no copy and the viewer
// link stops working. See src/lib/take-home.ts.
import type { APIRoute } from "astro";
import { apiJson, workspaceAccess } from "@/lib/workspace-access";
import { isDemoWorkspace } from "@/lib/demo";
import { DEMO_CANNOT_BE_TAKEN, readUsername, transferRepository } from "@/lib/take-home";
import { log } from "@/lib/log";

export const prerender = false;

export const POST: APIRoute = async ({ params, url, request }) => {
	if (isDemoWorkspace(params.slug)) return apiJson({ error: DEMO_CANNOT_BE_TAKEN }, 409);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return apiJson({ error: "Invalid request body" }, 400);
	}
	const username = readUsername(body);
	if (!username) return apiJson({ error: "Write a GitHub username: letters, digits and hyphens, as it appears in github.com/<username>." }, 400);

	const access = await workspaceAccess(params.slug, url.searchParams.get("key"), "Workspace not found");
	if (!access.ok) return access.response;
	const { octokit, org, slug } = access;

	const result = await transferRepository(octokit, org, slug, username);
	if (!result.ok) {
		log.warn("take_home.transfer.refused", { repo: `${org}/${slug}`, status: result.status });
		return apiJson({ error: result.error }, result.status);
	}
	log.info("take_home.transfer", { repo: `${org}/${slug}` });
	return apiJson(result.body, result.status);
};
