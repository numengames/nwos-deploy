// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from "astro";
import { errorStatus } from "@/lib/log";
import { apiJson, workspaceAccess } from "@/lib/workspace-access";
import { demoFile, isDemoWorkspace } from "@/lib/demo";

/** The subset of GitHub's contents payload this route reads. */
interface GitHubFile {
	name: string;
	path: string;
	content: string;
}

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
	const filePath = url.searchParams.get("path");

	if (!filePath || filePath.includes("..") || filePath.startsWith("/")) {
		return apiJson({ error: "path parameter required" }, 400);
	}

	// The public example, from this repository (see src/lib/demo.ts).
	if (isDemoWorkspace(params.slug)) {
		const demo = demoFile(filePath);
		return demo ? apiJson(demo, 200) : apiJson({ error: "File not found" }, 404);
	}

	const access = await workspaceAccess(params.slug, url.searchParams.get("key"), "File not found");
	if (!access.ok) return access.response;
	const { octokit, org, slug } = access;

	try {
		const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
			owner: org,
			repo: slug,
			path: filePath,
		});

		const content = Buffer.from((data as GitHubFile).content, "base64").toString("utf-8");

		return apiJson({ content, name: (data as GitHubFile).name, path: (data as GitHubFile).path }, 200);
	} catch (error) {
		return apiJson({ error: "File not found" }, errorStatus(error) ?? 500);
	}
};
