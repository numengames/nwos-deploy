// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from "astro";
import { errorStatus } from "@/lib/log";
import { apiJson, workspaceAccess } from "@/lib/workspace-access";

export const prerender = false;

interface TreeItem {
	name: string;
	path: string;
	type: "file" | "dir";
	children?: TreeItem[];
}

export const GET: APIRoute = async ({ params, url }) => {
	const access = await workspaceAccess(params.slug, url.searchParams.get("key"), "Workspace not found");
	if (!access.ok) return access.response;
	const { octokit, org, slug } = access;

	try {
		const { data } = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
			owner: org,
			repo: slug,
			tree_sha: "main",
			recursive: "1",
		});

		const tree = buildTree(data.tree as Array<{ path?: string; type?: string }>);

		return apiJson({ tree }, 200);
	} catch (error) {
		return apiJson({ error: "Workspace not found" }, errorStatus(error) ?? 500);
	}
};

function buildTree(flatItems: Array<{ path?: string; type?: string }>): TreeItem[] {
	const root: TreeItem[] = [];

	const items = flatItems.filter((item) => item.path && (item.type === "blob" || item.type === "tree"));

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
