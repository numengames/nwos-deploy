import { useEffect, useState } from "react";

interface RepoFile {
	name: string;
	path: string;
	type: "file" | "dir";
	children?: RepoFile[];
}

interface FileContent {
	content: string;
	name: string;
	path: string;
}

export default function WorkspaceViewer({ slug }: { slug: string }) {
	const [tree, setTree] = useState<RepoFile[]>([]);
	const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [fileLoading, setFileLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadTree();
		loadStatus();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slug]);

	async function loadTree() {
		try {
			const res = await fetch(`/api/workspace/${slug}/tree`);
			if (!res.ok) throw new Error("Workspace not found");
			const data = await res.json();
			setTree(data.tree);
			setLoading(false);
		} catch (e: any) {
			setError(e.message);
			setLoading(false);
		}
	}

	async function loadStatus() {
		try {
			const res = await fetch(`/api/workspace/${slug}/file?path=STATUS.md`);
			if (res.ok) {
				const data = await res.json();
				setStatus(data.content);
			}
		} catch {
			// STATUS.md might not exist yet
		}
	}

	async function loadFile(path: string) {
		setFileLoading(true);
		try {
			const res = await fetch(
				`/api/workspace/${slug}/file?path=${encodeURIComponent(path)}`,
			);
			if (!res.ok) throw new Error("File not found");
			const data = await res.json();
			setSelectedFile(data);
		} catch (e: any) {
			setSelectedFile({
				content: `Error loading file: ${e.message}`,
				name: path.split("/").pop() || path,
				path,
			});
		}
		setFileLoading(false);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<p className="font-mono text-sm text-muted-foreground animate-pulse">
					Loading workspace...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="text-center space-y-3">
					<p className="font-mono text-sm text-red-400">{error}</p>
					<a
						href="/velo"
						className="inline-block rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
					>
						← Back to NWOS
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[1100px] px-6 py-12">
			{/* Header */}
			<div className="mb-8 space-y-2">
				<p className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-accent">
					NWOS Workspace
				</p>
				<h1 className="font-display text-4xl sm:text-5xl tracking-tight text-foreground">
					{slug}
				</h1>
			</div>

			{/* Status bar */}
			{status && (
				<div className="mb-8 rounded-lg border border-border/50 bg-card/50 p-4">
					<div
						className="prose-invert text-sm text-muted-foreground [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:text-sm [&_strong]:text-foreground"
						dangerouslySetInnerHTML={{ __html: markdownToHtml(status) }}
					/>
				</div>
			)}

			{/* Main layout: sidebar + content */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
				{/* Sidebar */}
				<nav className="space-y-1 rounded-lg border border-border bg-card p-4 h-fit lg:sticky lg:top-20">
					<p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim mb-3">
						Files
					</p>
					<FileTree
						items={tree}
						onSelect={loadFile}
						selectedPath={selectedFile?.path}
					/>
				</nav>

				{/* Content */}
				<main className="min-w-0">
					{fileLoading ? (
						<div className="flex items-center justify-center py-20">
							<p className="font-mono text-sm text-muted-foreground animate-pulse">
								Loading file...
							</p>
						</div>
					) : selectedFile ? (
						<div className="rounded-lg border border-border bg-card p-6 sm:p-8">
							<p className="mb-4 font-mono text-[0.65rem] text-dim">
								{selectedFile.path}
							</p>
							<div
								className="prose-invert max-w-none text-sm leading-relaxed text-muted-foreground [&_h1]:text-2xl [&_h1]:font-display [&_h1]:text-foreground [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-accent [&_code]:text-xs [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-background [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-foreground [&_th]:text-xs [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic"
								dangerouslySetInnerHTML={{
									__html: markdownToHtml(selectedFile.content),
								}}
							/>
						</div>
					) : (
						<div className="flex items-center justify-center py-20 rounded-lg border border-dashed border-border">
							<p className="text-sm text-dim">
								Select a file from the sidebar to view its contents.
							</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

function FileTree({
	items,
	onSelect,
	selectedPath,
	depth = 0,
}: {
	items: RepoFile[];
	onSelect: (path: string) => void;
	selectedPath?: string;
	depth?: number;
}) {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	useEffect(() => {
		const initial: Record<string, boolean> = {};
		items.forEach((item) => {
			if (item.type === "dir") initial[item.path] = depth === 0;
		});
		setExpanded(initial);
	}, [items, depth]);

	const sorted = [...items].sort((a, b) => {
		if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
		return a.name.localeCompare(b.name);
	});

	return (
		<div className={depth > 0 ? "ml-3 border-l border-border/50 pl-2" : ""}>
			{sorted.map((item) => {
				if (item.type === "dir") {
					const isExpanded = expanded[item.path] ?? false;
					return (
						<div key={item.path}>
							<button
								onClick={() =>
									setExpanded((prev) => ({
										...prev,
										[item.path]: !prev[item.path],
									}))
								}
								className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-[0.7rem] text-muted-foreground hover:bg-card-hover hover:text-foreground transition-colors"
							>
								<span className="text-dim">{isExpanded ? "▾" : "▸"}</span>
								<span>{item.name}/</span>
							</button>
							{isExpanded && item.children && (
								<FileTree
									items={item.children}
									onSelect={onSelect}
									selectedPath={selectedPath}
									depth={depth + 1}
								/>
							)}
						</div>
					);
				}

				if (!item.name.endsWith(".md")) return null;

				const isSelected = selectedPath === item.path;
				return (
					<button
						key={item.path}
						onClick={() => onSelect(item.path)}
						className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-[0.7rem] transition-colors ${
							isSelected
								? "bg-accent/10 text-accent border border-accent/30"
								: "text-muted-foreground hover:bg-card-hover hover:text-foreground"
						}`}
					>
						<span className="text-dim">◇</span>
						<span className="truncate">{item.name}</span>
					</button>
				);
			})}
		</div>
	);
}

function markdownToHtml(md: string): string {
	let html = md
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/^### (.+)$/gm, "<h3>$1</h3>")
		.replace(/^## (.+)$/gm, "<h2>$1</h2>")
		.replace(/^# (.+)$/gm, "<h1>$1</h1>")
		.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/`(.+?)`/g, "<code>$1</code>")
		.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
		.replace(/^---$/gm, "<hr/>")
		.replace(/^- \[x\] (.+)$/gm, "<li>✅ $1</li>")
		.replace(/^- \\[ \\] (.+)$/gm, "<li>⬜ $1</li>")
		.replace(/^- (.+)$/gm, "<li>$1</li>")
		.replace(/^\|(.+)\|$/gm, (match) => {
			const cells = match
				.split("|")
				.filter((c) => c.trim())
				.map((c) => c.trim());
			if (cells.every((c) => /^[-:]+$/.test(c))) return "";
			const tag = "td";
			return (
				"<tr>" + cells.map((c) => `<${tag}>${c}</${tag}>`).join("") + "</tr>"
			);
		})
		.replace(/\n\n/g, "</p><p>")
		.replace(/\n/g, "<br/>");

	html = "<p>" + html + "</p>";
	html = html.replace(/<p>\s*<\/p>/g, "");
	html = html.replace(
		/(<li>[\s\S]*?<\/li>)(?=\s*(?:<li>|<\/p>|$))/g,
		"$1",
	);
	html = html.replace(
		/(?:<br\/>)*(<li>(?:[\s\S]*?<\/li>\s*(?:<br\/>)*)*<\/li>)/g,
		"<ul>$1</ul>",
	);
	html = html.replace(
		/(<tr>[\s\S]*?<\/tr>(?:\s*<tr>[\s\S]*?<\/tr>)*)/g,
		"<table>$1</table>",
	);

	return html;
}

