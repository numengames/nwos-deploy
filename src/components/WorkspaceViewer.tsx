// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/lib/log";
import TakeHome from "@/components/TakeHome";

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

export default function WorkspaceViewer({ slug, accessKey, title, demo = false }: { slug: string; accessKey: string; title?: string; demo?: boolean }) {
	const [tree, setTree] = useState<RepoFile[]>([]);
	const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [fileLoading, setFileLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const keyParam = `key=${encodeURIComponent(accessKey)}`;

	async function loadTree() {
		try {
			const res = await fetch(`/api/workspace/${slug}/tree?${keyParam}`);
			if (res.status === 403) throw new Error("This link has no key, or the key is wrong. Open the workspace from the link you were shown after paying.");
			if (!res.ok) throw new Error("Workspace not found");
			const data = await res.json();
			const items: RepoFile[] = Array.isArray(data.tree) ? data.tree : [];
			setTree(items);
			setLoading(false);
			// The first thing a reader sees is their organisation written,
			// not a file list: open the first founding document (panel,
			// 2026-10-04). Falls back to the first Markdown file there is.
			const first = firstDocument(items);
			if (first) void loadFile(first);
		} catch (e) {
			setError(errorMessage(e));
			setLoading(false);
		}
	}

	async function loadStatus() {
		try {
			const res = await fetch(`/api/workspace/${slug}/file?path=STATUS.md&${keyParam}`);
			if (res.ok) {
				const data = await res.json();
				setStatus(data.content);
			}
		} catch {
			// STATUS.md might not exist yet
		}
	}

	// Load-on-mount: both calls are async and only touch state after their
	// fetch resolves. Moving this to a data-fetching primitive would remove
	// the two disables below; until then they are silenced on purpose.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		loadTree();
		loadStatus();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slug]);

	async function loadFile(path: string) {
		setFileLoading(true);
		try {
			const res = await fetch(`/api/workspace/${slug}/file?path=${encodeURIComponent(path)}&${keyParam}`);
			if (!res.ok) throw new Error("File not found");
			const data = await res.json();
			setSelectedFile(data);
		} catch (e) {
			setSelectedFile({
				content: `Error loading file: ${errorMessage(e)}`,
				name: path.split("/").pop() || path,
				path,
			});
		}
		setFileLoading(false);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<p className="font-mono text-sm text-muted-foreground">
					Loading workspace
					<span className="waiting-dots" aria-hidden="true">
						···
					</span>
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="text-center space-y-3">
					<p className="font-mono text-sm text-coral">{error}</p>
					<a href="/velo" className="inline-block rounded-control border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-instante ease-ciclo hover:border-accent hover:text-accent">
						Go back to NWOS
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[1100px] px-6 py-12">
			{/* Header */}
			<div className="mb-8 space-y-2">
				<p className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-accent">{demo ? "The public example" : "Your workspace"}</p>
				<h1 className="font-display text-4xl font-normal tracking-[-0.025em] sm:text-5xl text-foreground">{title ?? slug}</h1>
			</div>

			{/* Status bar */}
			{status && (
				<div className="mb-8 rounded-marco border border-border/50 bg-card/50 p-4">
					<div className="prose-invert text-sm text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:text-sm [&_strong]:text-foreground" dangerouslySetInnerHTML={{ __html: markdownToHtml(status) }} />
				</div>
			)}

			{/* Main layout: sidebar + content */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
				{/* Sidebar */}
				<nav className="space-y-1 rounded-marco border border-border bg-card p-4 h-fit lg:sticky lg:top-20">
					<p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim mb-3">Files</p>
					<FileTree items={tree} onSelect={loadFile} selectedPath={selectedFile?.path} />
				</nav>

				{/* Content */}
				<main className="min-w-0">
					{fileLoading ? (
						<div className="flex items-center justify-center py-20">
							<p className="font-mono text-sm text-muted-foreground">
								Loading file
								<span className="waiting-dots" aria-hidden="true">
									···
								</span>
							</p>
						</div>
					) : selectedFile ? (
						<div className="rounded-marco border border-border bg-card p-6 sm:p-8">
							<p className="mb-4 font-mono text-[0.65rem] text-dim">{selectedFile.path}</p>
							<div
								className="prose-invert max-w-none text-sm leading-relaxed text-muted-foreground [&_h2]:text-2xl [&_h2]:font-display [&_h2]:text-foreground [&_h2]:mb-4 [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-3 [&_h3]:mt-5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mb-2 [&_h4]:mt-4 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-control [&_code]:text-accent [&_code]:text-xs [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-background [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-foreground [&_th]:text-xs [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic"
								dangerouslySetInnerHTML={{
									__html: markdownToHtml(selectedFile.content),
								}}
							/>
						</div>
					) : (
						<div className="flex items-center justify-center py-20 rounded-marco border border-dashed border-border">
							<p className="text-sm text-dim">Select a file from the sidebar to view its contents.</p>
						</div>
					)}
				</main>
			</div>

			<TakeHome slug={slug} accessKey={accessKey} demo={demo} />
		</div>
	);
}

/** The first founding document, or the first Markdown file: what opens on arrival. */
function firstDocument(items: RepoFile[]): string | null {
	const flat: string[] = [];
	const walk = (list: RepoFile[]) => {
		for (const item of list) {
			if (item.type === "file" && item.name.endsWith(".md")) flat.push(item.path);
			if (item.children) walk(item.children);
		}
	};
	walk(items);
	flat.sort();
	return flat.find((p) => /^(canon|principles)\//.test(p)) ?? flat.find((p) => p !== "STATUS.md") ?? flat[0] ?? null;
}

function FileTree({ items, onSelect, selectedPath, depth = 0 }: { items: RepoFile[]; onSelect: (path: string) => void; selectedPath?: string; depth?: number }) {
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});

	// Derived, not stored: the default open/closed state follows the items,
	// and a click layers an override on top of it.
	const defaults = useMemo(() => {
		const initial: Record<string, boolean> = {};
		items.forEach((item) => {
			if (item.type === "dir") initial[item.path] = depth === 0;
		});
		return initial;
	}, [items, depth]);

	const expanded = { ...defaults, ...overrides };

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
									setOverrides((prev) => ({
										...prev,
										[item.path]: !(prev[item.path] ?? defaults[item.path]),
									}))
								}
								className="flex w-full items-center gap-1.5 rounded-control px-2 py-1 text-left font-mono text-[0.7rem] text-muted-foreground hover:bg-card-hover hover:text-foreground transition-colors"
							>
								<span className="text-dim">{isExpanded ? "▾" : "▸"}</span>
								<span>{item.name}/</span>
							</button>
							{isExpanded && item.children && <FileTree items={item.children} onSelect={onSelect} selectedPath={selectedPath} depth={depth + 1} />}
						</div>
					);
				}

				if (!item.name.endsWith(".md")) return null;

				const isSelected = selectedPath === item.path;
				return (
					<button key={item.path} onClick={() => onSelect(item.path)} className={`flex w-full items-center gap-1.5 rounded-control px-2 py-1 text-left font-mono text-[0.7rem] transition-colors ${isSelected ? "bg-accent/10 text-accent border border-accent/30" : "text-muted-foreground hover:bg-card-hover hover:text-foreground"}`}>
						<span className="text-dim">◇</span>
						<span className="truncate">{item.name}</span>
					</button>
				);
			})}
		</div>
	);
}

// El markdown viene de repos poblados a partir de input del usuario y de
// texto generado por LLM: se escapa TODO el HTML antes de aplicar las reglas,
// y los hrefs se limitan a esquemas seguros (nada de javascript:).
function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeHref(href: string): string | null {
	const trimmed = href.trim();
	if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
	if (/^(\/|#|\.\/)/.test(trimmed)) return trimmed;
	return null;
}

const NEEDS_REVIEW_TOKEN = "%%NEEDS_REVIEW%%";
const REVIEW_NOTE_OPEN = "%%REVIEW_NOTE%%";
const REVIEW_NOTE_CLOSE = "%%/REVIEW_NOTE%%";

/**
 * Comments are read by position, never by a `<!--…-->` regex: a regex
 * strip can leave a `<!--` behind and CodeQL fails the build on it
 * (incomplete multi-character sanitization). Two marks the model leaves
 * for the reader survive as tokens — a bare "NEEDS REVIEW" (a badge) and
 * "NEEDS REVIEW: why" (the badge plus the note, kept: the old renderer
 * dropped every comment with text, so the model's reasons never reached
 * the reader; panel 2026-10-04). Every other comment is dropped; an
 * unclosed one is dropped to the end of the text. The result is still
 * HTML-escaped before any markup is drawn.
 */
export function liftReviewMarks(md: string): string {
	const OPEN = "<!--";
	const CLOSE = "-->";
	let out = "";
	let at = 0;
	for (;;) {
		const start = md.indexOf(OPEN, at);
		if (start === -1) {
			out += md.slice(at);
			break;
		}
		out += md.slice(at, start);
		const end = md.indexOf(CLOSE, start + OPEN.length);
		if (end === -1) break;
		const inner = md.slice(start + OPEN.length, end).trim();
		const mark = /^NEEDS REVIEW(?:\s*:\s*([\s\S]*))?$/i.exec(inner);
		if (mark) {
			const note = (mark[1] ?? "").replace(/\s+/g, " ").trim();
			out += note ? `${REVIEW_NOTE_OPEN}${note}${REVIEW_NOTE_CLOSE}` : NEEDS_REVIEW_TOKEN;
		}
		at = end + CLOSE.length;
	}
	return out;
}

function markdownToHtml(md: string): string {
	let html = escapeHtml(liftReviewMarks(md))
		// Document headings sit one level below the page's own H1 (the
		// workspace name), so every page keeps a single H1 (STD-034).
		.replace(/^### (.+)$/gm, "<h4>$1</h4>")
		.replace(/^## (.+)$/gm, "<h3>$1</h3>")
		.replace(/^# (.+)$/gm, "<h2>$1</h2>")
		.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/`(.+?)`/g, "<code>$1</code>")
		.replace(/\[(.+?)\]\((.+?)\)/g, (match, text, href) => {
			const url = safeHref(href);
			return url ? `<a href="${url}">${text}</a>` : text;
		})
		.replace(/^---$/gm, "<hr/>")
		.replace(/^- \[x\] (.+)$/gm, "<li>[x] $1</li>")
		.replace(/^- \[ \] (.+)$/gm, "<li>[ ] $1</li>")
		.replace(/^- (.+)$/gm, "<li>$1</li>")
		.replace(/^\|(.+)\|$/gm, (match) => {
			const cells = match
				.split("|")
				.filter((c) => c.trim())
				.map((c) => c.trim());
			if (cells.every((c) => /^[-:]+$/.test(c))) return "";
			const tag = "td";
			return "<tr>" + cells.map((c) => `<${tag}>${c}</${tag}>`).join("") + "</tr>";
		})
		.replace(/\n\n/g, "</p><p>")
		.replace(/\n/g, "<br/>");

	html = "<p>" + html + "</p>";
	html = html.replace(/<p>\s*<\/p>/g, "");
	html = html.replace(/(<li>[\s\S]*?<\/li>)(?=\s*(?:<li>|<\/p>|$))/g, "$1");
	html = html.replace(/(?:<br\/>)*(<li>(?:[\s\S]*?<\/li>\s*(?:<br\/>)*)*<\/li>)/g, "<ul>$1</ul>");
	html = html.replace(/(<tr>[\s\S]*?<\/tr>(?:\s*<tr>[\s\S]*?<\/tr>)*)/g, "<table>$1</table>");
	html = html.replace(/%%NEEDS_REVIEW%%/g, '<span class="inline-block rounded-control border border-yellow/40 bg-yellow/10 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-yellow">needs review</span>');
	html = html.replace(/(?:<p>)?%%REVIEW_NOTE%%([\s\S]*?)%%\/REVIEW_NOTE%%(?:<\/p>)?/g, '<aside class="my-3 rounded-marco border border-yellow/40 bg-yellow/10 p-3 text-sm text-foreground"><span class="mr-2 inline-block rounded-control border border-yellow/40 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-yellow">needs review</span>$1</aside>');

	return html;
}
