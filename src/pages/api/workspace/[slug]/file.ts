import type { APIRoute } from "astro";
import { Octokit } from "octokit";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
	const { slug } = params;
	const filePath = url.searchParams.get("path");

	if (!filePath) {
		return new Response(JSON.stringify({ error: "path parameter required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const org = import.meta.env.GITHUB_ORG;
	const token = import.meta.env.GITHUB_TOKEN;

	if (!slug || !org || !token) {
		return new Response(JSON.stringify({ error: "Missing configuration" }), {
			status: 500,
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

