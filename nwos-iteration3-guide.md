# NWOS — Iteración 3: Client Workspace Web

## Context for the AI executing this

You are working on the `pablofm-web` repo (Astro 5 + React + Tailwind). Iterations 1 and 2 are complete: the form at `/velo` creates a GitHub repo and an AI agent populates it with real company data. Now we need a web page where the CEO can browse their workspace visually — without touching GitHub.

Follow the design system in `DESIGN.md`. Do not touch any existing pages other than what's specified here.

---

## Goal

After a workspace is created, the CEO gets a URL where they can browse all their documentation visually — rendered markdown, sidebar navigation, status overview.

---

## Architecture (simplest MVP)

Instead of generating a separate static site per client, we add a dynamic page to the existing `pablofm.com`:

```
pablofm.com/workspace/figma
    → Astro page reads repo contents via GitHub API
    → Renders markdown as HTML
    → Sidebar shows folder structure
    → CEO browses without touching GitHub
```

No GitHub Actions, no GitHub Pages, no extra infrastructure. One page, one API call, done.

---

## Step-by-step implementation

### Step 1: Create the workspace layout page

Create the file `src/pages/workspace/[slug].astro`:

```astro
---
import Layout from "../../layouts/Layout.astro";
import WorkspaceViewer from "../../components/WorkspaceViewer";

export const prerender = false;

const { slug } = Astro.params;
---

<Layout title={`${slug} — NWOS Workspace`}>
  <WorkspaceViewer slug={slug} client:load />
</Layout>
```

Note: we use `client:load` (not `client:visible`) because this is the main content — it should load immediately.

### Step 2: Create the WorkspaceViewer React component

Create `src/components/WorkspaceViewer.tsx`:

```tsx
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

  // Load repo tree on mount
  useEffect(() => {
    loadTree();
    loadStatus();
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
    } catch (e) {
      // STATUS.md might not exist yet
    }
  }

  async function loadFile(path: string) {
    setFileLoading(true);
    try {
      const res = await fetch(
        `/api/workspace/${slug}/file?path=${encodeURIComponent(path)}`
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

// ── File tree component ──
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

  // Auto-expand first level
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.type === "dir") initial[item.path] = depth === 0;
    });
    setExpanded(initial);
  }, [items]);

  // Sort: dirs first, then files, alphabetically
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

        // Only show .md files
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

// ── Simple markdown to HTML converter ──
function markdownToHtml(md: string): string {
  let html = md
    // Remove HTML comments (like <!-- NEEDS REVIEW -->)
    .replace(/<!--[\s\S]*?-->/g, "")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, "<code>$1</code>")
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, "<hr/>")
    // Checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<li>✅ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li>⬜ $1</li>')
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Tables (basic)
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return ""; // separator row
      const tag = "td";
      return (
        "<tr>" + cells.map((c) => `<${tag}>${c}</${tag}>`).join("") + "</tr>"
      );
    })
    // Paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    // Single newlines within paragraphs
    .replace(/\n/g, "<br/>");

  // Wrap in paragraph
  html = "<p>" + html + "</p>";

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li>[\s\S]*?<\/li>)(?=\s*(?:<li>|<\/p>|$))/g,
    "$1"
  );
  html = html.replace(
    /(?:<br\/>)*(<li>(?:[\s\S]*?<\/li>\s*(?:<br\/>)*)*<\/li>)/g,
    "<ul>$1</ul>"
  );

  // Wrap consecutive <tr> in <table>
  html = html.replace(
    /(<tr>[\s\S]*?<\/tr>(?:\s*<tr>[\s\S]*?<\/tr>)*)/g,
    "<table>$1</table>"
  );

  return html;
}
```

### Step 3: Create the workspace API routes

We need two API routes for the workspace viewer:

**3a. Tree endpoint** — Create `src/pages/api/workspace/[slug]/tree.ts`:

```typescript
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

  const octokit = new Octokit({ auth: token });

  try {
    // Get the full repo tree recursively
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      {
        owner: org,
        repo: slug!,
        tree_sha: "main",
        recursive: "1",
      }
    );

    // Convert flat list to nested tree
    const tree = buildTree(data.tree);

    return new Response(JSON.stringify({ tree }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Workspace not found" }),
      {
        status: error.status || 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

function buildTree(
  flatItems: Array<{ path?: string; type?: string }>
): TreeItem[] {
  const root: TreeItem[] = [];

  // Filter to only blobs (files) and trees (dirs) with paths
  const items = flatItems.filter(
    (item) => item.path && (item.type === "blob" || item.type === "tree")
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
```

**3b. File content endpoint** — Create `src/pages/api/workspace/[slug]/file.ts`:

```typescript
import type { APIRoute } from "astro";
import { Octokit } from "octokit";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const { slug } = params;
  const filePath = url.searchParams.get("path");

  if (!filePath) {
    return new Response(
      JSON.stringify({ error: "path parameter required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const org = import.meta.env.GITHUB_ORG;
  const token = import.meta.env.GITHUB_TOKEN;

  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner: org,
        repo: slug!,
        path: filePath,
      }
    );

    const content = Buffer.from(
      (data as any).content,
      "base64"
    ).toString("utf-8");

    return new Response(
      JSON.stringify({
        content,
        name: (data as any).name,
        path: (data as any).path,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "File not found" }),
      {
        status: error.status || 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Step 4: Update DeployForm success state

In `src/components/DeployForm.tsx`, update the success state to link to the workspace viewer instead of (or in addition to) the GitHub repo:

In the success div, add a second link BEFORE the GitHub repo link:

```tsx
<a
  href={`/workspace/${result.slug}`}
  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90"
>
  Browse workspace →
</a>
<a
  href={result.repoUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
>
  View on GitHub →
</a>
```

The primary CTA should be "Browse workspace" (accent button). The GitHub link becomes secondary (outline button).

### Step 5: Handle the dynamic route in Astro config

Make sure the Astro config allows dynamic server-rendered routes. The `output: "static"` mode with `prerender = false` on specific pages should handle this. No config changes needed if Iteration 1 already works.

---

## Design system compliance

All components MUST follow `DESIGN.md`:

- **Background:** `#000000` (page) / `#0a0a0c` (cards)
- **Borders:** `border-border` (`#27272a`)
- **Text:** `text-foreground` (`#fafafa`) / `text-muted-foreground` (`#a1a1aa`) / `text-dim` (`#71717a`)
- **Accent:** `text-accent` (`#f97316`)
- **Labels:** `font-mono text-[0.65rem] uppercase tracking-[0.2em]`
- **Cards:** `rounded-lg border border-border bg-card p-6`
- **Container:** `mx-auto max-w-[1100px] px-6`
- **Sidebar:** sticky on desktop, collapsible on mobile
- **Typography in rendered markdown:** Instrument Serif for h1, DM Sans for body
- **No light mode**
- **Transitions:** `transition-colors` on all interactive elements

---

## File structure created

```
src/
├── pages/
│   ├── workspace/
│   │   └── [slug].astro          → Dynamic workspace page
│   └── api/
│       └── workspace/
│           └── [slug]/
│               ├── tree.ts       → Returns repo file tree
│               └── file.ts       → Returns file content
└── components/
    └── WorkspaceViewer.tsx        → Full workspace UI (React island)
```

---

## Testing

1. Run `npm run dev`
2. Go to `http://localhost:4321/workspace/figma` (or whatever repo slug you created)
3. The sidebar should show the repo's file tree
4. Clicking a `.md` file should render its content in the main area
5. STATUS.md should appear in the status bar at the top
6. The design should match pablofm.com (dark theme, same fonts, same colors)

---

## Definition of done

- [ ] `/workspace/[slug]` page renders the workspace
- [ ] Sidebar shows the repo file tree (folders expandable)
- [ ] Clicking a `.md` file renders its content as HTML
- [ ] STATUS.md is shown at the top as a status bar
- [ ] DeployForm links to `/workspace/[slug]` after creation
- [ ] Design follows DESIGN.md (dark theme, correct fonts, colors, spacing)
- [ ] Works on both mobile and desktop
- [ ] Error state if workspace doesn't exist
- [ ] Build passes (`npm run build`)

---

## Important notes for the AI executing this

- Do NOT modify any existing pages. Only create new files and update `DeployForm.tsx`.
- The markdown-to-HTML converter is intentionally simple. Do NOT install a markdown library — keep it lightweight for the MVP.
- All API routes need `export const prerender = false`.
- The `[slug]` in file paths is Astro's dynamic route syntax — the brackets are literal in the filename.
- The file tree API uses GitHub's Git Trees API (recursive) — this is ONE API call for the entire tree, much more efficient than listing each directory.
- Only show `.md` files in the sidebar for now. Other files can be added later.
- The workspace page is public — no auth. This is fine for MVP. Auth comes later.
