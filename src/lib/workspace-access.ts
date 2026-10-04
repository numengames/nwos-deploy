// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The gate both viewer routes (/api/workspace/[slug]/tree and /file) pass
// before reading a byte: configuration, slug shape, key, and the workspace
// marker. The token behind these routes sees every repository in the
// organisation, so a valid key alone is not enough — the repository must
// carry the `nwos-workspace` topic the deploy flow sets (audit 2026-10-02).
// The public demo is the one exception: served with no key and no marker.
import { Octokit } from "octokit";
import { getEnv } from "@/lib/env";
import { isDemoWorkspace } from "@/lib/demo";
import { MISSING_SIGNING_SECRET, keySecret, verifyWorkspaceKey } from "@/lib/token";
import { isWorkspace } from "@/lib/workspace-marker";
import { errorStatus } from "@/lib/log";

/** Headers on every viewer answer: the key rides in the query string. */
export const API_HEADERS = {
	"Content-Type": "application/json",
	"Cache-Control": "no-store",
	"Referrer-Policy": "no-referrer",
} as const;

export const apiJson = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: API_HEADERS });

export type Access = { ok: true; octokit: Octokit; org: string; slug: string; token: string } | { ok: false; response: Response };

export async function workspaceAccess(slug: string | undefined, key: string | null, notFound: string): Promise<Access> {
	const env = getEnv();
	const org = env.GITHUB_ORG;
	const token = env.GITHUB_TOKEN;

	if (!org || !token) return { ok: false, response: apiJson({ error: "Missing configuration" }, 500) };

	if (!slug || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) return { ok: false, response: apiJson({ error: notFound }, 404) };

	const octokit = new Octokit({ auth: token });
	if (isDemoWorkspace(slug)) return { ok: true, octokit, org, slug, token };

	const secret = keySecret(env);
	if (!secret) return { ok: false, response: apiJson({ error: MISSING_SIGNING_SECRET }, 500) };

	if (!(await verifyWorkspaceKey(slug, key, secret))) return { ok: false, response: apiJson({ error: "Access denied" }, 403) };

	try {
		const { data } = await octokit.request("GET /repos/{owner}/{repo}", { owner: org, repo: slug });
		if (!isWorkspace((data as { topics?: string[] }).topics)) return { ok: false, response: apiJson({ error: notFound }, 404) };
	} catch (error) {
		const status = errorStatus(error);
		return { ok: false, response: apiJson({ error: notFound }, status === 404 ? 404 : 502) };
	}
	return { ok: true, octokit, org, slug, token };
}
