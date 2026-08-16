import type { APIRoute } from "astro";
import { Octokit } from "octokit";
import { getEnv } from "@/lib/env";
import { keySecret, verifyWorkspaceKey } from "@/lib/token";

export const prerender = false;

export const GET: APIRoute = async ({ params, url, locals }) => {
	const { slug } = params;
	const filePath = url.searchParams.get("path");

	if (!filePath || filePath.includes("..") || filePath.startsWith("/")) {
		return new Response(JSON.stringify({ error: "path parameter required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const env = getEnv(locals);
	const org = env.GITHUB_ORG;
	const token = env.GITHUB_TOKEN;

	if (!org || !token) {
		return new Response(JSON.stringify({ error: "Missing configuration" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!slug || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) {
		return new Response(JSON.stringify({ error: "File not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const key = url.searchParams.get("key");
	if (!(await verifyWorkspaceKey(slug, key, keySecret(env)))) {
		return new Response(JSON.stringify({ error: "Access denied" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	const octokit = new Octokit({ auth: token });

	try {
		const { data } = await octokit.request(
			"GET /repos/{owner}/{repo}/contents/{path}",
			{
				owner: org,
				repo: slug,
				path: filePath,
			},
		);

		const content = Buffer.from((data as any).content, "base64").toString(
			"utf-8",
		);

		return new Response(
			JSON.stringify({
				content,
				name: (data as any).name,
				path: (data as any).path,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error: any) {
		return new Response(JSON.stringify({ error: "File not found" }), {
			status: error?.status || 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

