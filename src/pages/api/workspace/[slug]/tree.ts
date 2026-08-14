import type { APIRoute } from "astro";
import { Octokit } from "octokit";

export const prerender = false;

interface TreeItem {
	name: string;
	path: string;
	type: "file" | "dir";
	children?: TreeItem[];
}

export const GET: APIRoute = async ({ params }) => {
	const { slug } = params;
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
			"GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
			{
				owner: org,
				repo: slug,
				tree_sha: "main",
				recursive: "1",
			},
		);

		const tree = buildTree(data.tree as Array<{ path?: string; type?: string }>);

		return new Response(JSON.stringify({ tree }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: "Workspace not found" }), {
			status: error?.status || 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

function buildTree(
	flatItems: Array<{ path?: string; type?: string }>,
): TreeItem[] {
	const root: TreeItem[] = [];

	const items = flatItems.filter(
		(item) => item.path && (item.type === "blob" || item.type === "tree"),
	);

	for (const item of items) {
		const parts = item.path!.split("/");
		let current = root;

		for (let i = 0; i < parts.length; i++) {
			const name = parts[i];
			const path = parts.slice(0, i + 1).join("/");
			const isLast = i === parts.length - 1;

			const existing = current.find((c) => c.name === name);

			if (existing) {
				if (existing.type === "dir" && existing.children) {
					current = existing.children;
				}
			} else {
				const newItem: TreeItem = {
					name,
					path,
					type: isLast && item.type === "blob" ? "file" : "dir",
				};
				if (newItem.type === "dir") {
					newItem.children = [];
				}
				current.push(newItem);
				if (newItem.type === "dir" && newItem.children) {
					current = newItem.children;
				}
			}
		}
	}

	return root;
}

