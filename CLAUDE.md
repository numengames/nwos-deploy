# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server at http://localhost:4321
- `npm run build` — production build to `dist/`

No tests, lint, or CI. Node ≥ 22.12 required.

## Stack & architecture

Astro 5, `output: "static"` with the Vercel adapter, deployed at `https://nwos.numen.games`. React 19 islands only where a `client:` directive is used. Tailwind 3 with tokens as CSS vars in `src/styles/global.css`, shadcn/ui in `src/components/ui/`. Path alias `@/*` → `src/*`. Dark-only design system documented in `DESIGN.md` (its layout/spacing rules apply; accent is teal `#2DD4BF`, fonts are Geist/Geist Mono).

This repo was extracted from `pablofm-web` (Pablo FM's personal site), which keeps redirects pointing here.

- **Routes**: `src/pages/`, mostly static `.astro` pages in Spanish (`misiones`, `decisiones`, `planos`, `reportes`, `archive`, etc.). The index is the English NWOS product landing (`/nwos` redirects to `/`). Dynamic routes (`[id].astro`) map over hardcoded TS modules in `src/data/` with `getStaticPaths()`; `archive/[fondo].astro` keeps its data inline in the page.
- **SSR opt-outs** (`export const prerender = false`): `velo.astro`, `workspace/[slug].astro`, and all `src/pages/api/*`.
- **NWOS deploy flow**: `/velo` renders `DeployForm.tsx` → POST `/api/registro` → creates a private GitHub repo from a template, generates canon docs with the Anthropic API (+ web search tool), commits them, updates `STATUS.md`. Browsed at `/workspace/[slug]` via `WorkspaceViewer.tsx` calling `/api/workspace/[slug]/tree` and `/file`. `api/populate.ts` is a leftover duplicate of logic inlined in `registro.ts`.
- **`src/data/missions.ts` runs at build time with top-level await**: loads mission markdown from `numengames/numinia-digital-agents` — first from a sibling checkout, then the unauthenticated GitHub API. The folder (`missions/queue|active|review|done|freeze`) determines status. Separate from and not synced with `misiones.ts` (hardcoded Spanish data feeding `/misiones`).

## Environment variables

`GITHUB_ORG`, `GITHUB_TOKEN`, `GITHUB_TEMPLATE_REPO`, `ANTHROPIC_API_KEY` (see `.env.example`), read via `import.meta.env` in the API routes. Without them the velo/workspace routes return 500; the static pages still build.
