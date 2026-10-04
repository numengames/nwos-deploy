// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The public example workspace, served from this repository.
//
// Why static: the example used to be a repository read with the house's
// GitHub token, so the free example died of the same 500 as the purchase
// whenever a secret was missing (QA 2026-10-03). The example is the second
// call to action of the home page; it must work with no secrets, no
// network and no cost. The organisation in it is INVENTED on purpose: no
// real client's workspace is ever shown to a visitor.
//
// The files live in src/content/demo/** and are bundled at build time
// (import.meta.glob, eager): the viewer runs inside a Worker with no
// node:fs.

export const DEMO_WORKSPACE_SLUG = "faro-austral";

/** The name a reader sees, instead of the slug. */
export const DEMO_WORKSPACE_NAME = "Faro Austral";

export function isDemoWorkspace(slug: string | undefined): boolean {
	return slug === DEMO_WORKSPACE_SLUG;
}

const files = import.meta.glob("../content/demo/**/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

/** path inside the workspace → its text. */
export const DEMO_FILES: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(files).map(([key, text]) => [key.replace(/^.*\/content\/demo\//, ""), text]));

export interface DemoTreeItem {
	name: string;
	path: string;
	type: "file" | "dir";
	children?: DemoTreeItem[];
}

/** The same shape /api/workspace/[slug]/tree returns for a real workspace. */
export function demoTree(): DemoTreeItem[] {
	const root: DemoTreeItem[] = [];
	for (const path of Object.keys(DEMO_FILES).sort()) {
		const parts = path.split("/");
		let level = root;
		parts.forEach((name, i) => {
			const isLeaf = i === parts.length - 1;
			const here = parts.slice(0, i + 1).join("/");
			let node = level.find((n) => n.name === name);
			if (!node) {
				node = isLeaf ? { name, path: here, type: "file" } : { name, path: here, type: "dir", children: [] };
				level.push(node);
			}
			if (!isLeaf) level = node.children!;
		});
	}
	return root;
}

export function demoFile(path: string): { name: string; path: string; content: string } | null {
	const content = DEMO_FILES[path];
	if (content === undefined) return null;
	return { name: path.split("/").pop()!, path, content };
}
