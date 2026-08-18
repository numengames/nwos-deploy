# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**First instruction (AGT-01): audit the current branch state before assuming anything.** Never trust that the repo matches this file, the README, or a mission brief — read what is actually there first.

## Standards adopted by reference

| Document                     | Canonical location                                               | What it governs here                                 |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| **Engineering Standards**    | `numengames/numinia-nwos` → `standards/engineering-standards.md` | CI, repo hygiene, security practices, agent protocol |
| **Sistema de Diseño v5.0.0** | same folder → `standards/2026_08_18-Sistema_de_Diseno-v5.0.0.md` | Every visible pixel of nwos.numen.games              |
| **Canon C-005**              | Numinia canon                                                    | Licensing — reproduced in full below                 |

This repo is **downstream**: it executes those documents, it does not edit them. A change to a standard goes upstream via ADR + PR (engineering-standards §7.1).

Follow the §7 protocol: classify every task as **cosmetic** or **irreversible**; when in doubt it is irreversible. Reference practice IDs in commits that touch them (e.g. `ci: pin actions by SHA (SEC-07)`).

**AI stance (AGT-06).** Autonomous: copy and content, styling within the design tokens, tests, docs, mechanical fixes to `[AUTO]` practices. **Never without Oracle sign-off:** anything in the Licensing section below, repo visibility, secrets or Cloudflare credentials, DNS and custom domains, the workspace access-key scheme, weakening any CI check, force-pushing or rewriting history on `main`.

## Design system — the short version

Full contract in the master document §19; the reusable fragment is reproduced verbatim in `docs/design-system-fragment.md`. `DESIGN.md` is **superseded** and kept only for what the master does not cover.

- **Registers:** the landing and the deploy flow are **Umbral**; `/velo` and the workspace viewer are the **Velo** (§2.7) — the register boundary is visible, the two never blend.
- **Colour only from §19.3.** Never invent a hex: every value lives in `src/styles/global.css` as an RGB triplet and reaches components as a Tailwind token.
- The Velo adds **alpha over canonical colours**, never new hexes: grid ≤3%, mist ≤8%, atmosphere behind the content, Nocturno only.
- **The sky** (§2.7.1) is the rarity scale made cosmos: 175 stars, weights 60/25/10/4/1, no parallax, stopped under `prefers-reduced-motion`.
- **Typography: only Geist and Geist Mono**, self-hosted through fontsource.
- Spacing on the 4 scale; two radii (`control` 6px, `marco` 8px); action fills are Turquesa `#017C8D` and darken on hover.
- Motion only from the §10.1 catalogue; no parallax, no glitch, no ambient loops.
- WCAG 2.2 AA is the floor. Nothing communicated by colour alone.

## Logging

`src/lib/log.ts` holds the only sanctioned `console` call: everything else emits structured JSON through `log.info/warn/error` (SRE-03). `errorMessage()` and `errorStatus()` read an unknown thrown value without pretending it is an `Error`.

## Commands

- `npm run dev` — dev server at http://localhost:4321
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

- `npm test` — vitest unit tests in `test/` (pure logic: mould spec parsing, licence classification, tokens, slugs)
- `npm run type-check` — `astro check` (zero errors; it is a blocking gate)
- `npm run lint` — prettier check + eslint (`no-console` is an error: SRE-03)
- `npm run license-check` — C-005 §5 artifact guard over `dist/` (also runs as `postbuild`)

CI runs `type-check → lint → test → build` on every push and PR (ARC-01), plus a
presence check over the repository checklist; `license-check.yml` keeps the C-005
artifact guard and the CLA gate; Scorecard runs weekly. Node ≥ 22.12 required.

## Stack & architecture

Astro 5, `output: "static"` with the Cloudflare Workers adapter (`@astrojs/cloudflare` v12, config in `wrangler.jsonc`), deployed at `https://nwos.numen.games`. React 19 islands only where a `client:` directive is used. Tailwind 3 with the canonical §19.3 tokens as CSS vars in `src/styles/global.css`. Path alias `@/*` → `src/*`. Nocturno-only. Fonts are Geist and Geist Mono.

This repo was extracted from `pablofm-web` (Pablo FM's personal site). The Numinia viewer that used to live here was extracted to `numengames/numinia-nwos` (branch `merge-viewer`, serving numinia.org); this repo is only the NWOS deployment service.

- **Routes**: exactly three pages — `/` (English product landing, static), `/velo` (deploy form, SSR), `/workspace/[slug]` (workspace browser, SSR) — plus the API routes under `src/pages/api/`.
- **SSR opt-outs** (`export const prerender = false`): `velo.astro`, `workspace/[slug].astro`, and all `src/pages/api/*`.
- **NWOS deploy flow**: `/velo` renders `DeployForm.tsx` → POST `/api/registro` → creates a private GitHub repo from a template, personalizes placeholder files, installs the client's `LICENSE` (verifies the template's `LICENSE.client`, strips the mould's own `LICENSE`/`REUSE.toml`/`TRADEMARKS.md`/`LICENSES/`, renames the personalized `LICENSE.client` → `LICENSE`; any failure in this step aborts the deploy), generates canon docs with the Anthropic API (+ web search tool), commits them, updates `STATUS.md`. Browsed at `/workspace/[slug]?key=<hmac>` via `WorkspaceViewer.tsx` calling `/api/workspace/[slug]/tree` and `/file` — both require the per-workspace access key (HMAC of the slug, `src/lib/token.ts`) that `/api/registro` returns once at deploy time. The original specs for this flow live in `nwos-iteration2-guide.md` and `nwos-iteration3-guide.md` at the repo root (historical — they still refer to pablofm-web).
- **`src/components/SnapshotNotice.astro` is an orphan**: it was written for the viewer pages after the extraction snapshot was taken, so it exists nowhere else; kept here until it is ported to `numinia-nwos`.

## Environment variables

`GITHUB_ORG`, `GITHUB_TOKEN`, `GITHUB_TEMPLATE_REPO`, `ANTHROPIC_API_KEY` (documented in `wrangler.jsonc`), read in the API routes via `getEnv(locals)` (`src/lib/env.ts`): `locals.runtime.env` on Workers, falling back to `import.meta.env` for `npm run dev` with a local `.env`. In production they are wrangler secrets (`npx wrangler secret put <KEY>`); for `wrangler dev` use `.dev.vars`. Without them the velo/workspace routes return 500; the static pages still build.

## Licensing — from Numinia canon C-005 (source of truth; do not edit here)

**Emit:** `packages/*` — library/SDK/types/tokens/script/CI/infra → `MIT` ·
`apps/*` — deployable app that _decides_ (identity, progression, billing) →
`AGPL-3.0-only` · code on a third-party strong-copyleft engine, **separate repo** →
the engine's · assets/data/metadata/design tokens → `CC0-1.0` · docs/ADRs/specs →
`CC-BY-4.0` · lore/brand/unpublished → none, all rights reserved.

A monorepo may mix these: declare per directory in `REUSE.toml`. Dependencies MUST
flow apps → packages, never the reverse. **One file, one regime:** never write an
`AND` expression mixing an open license with reserved — that is an unsatisfiable
permission. Split the content out into its own file instead.

**Generators:** a generator never propagates its own license to what it generates. The
template is ours (usually MIT); the generated work belongs to whoever commissioned it,
and the template MUST emit a reserved-rights `LICENSE` in the client's name — never its
own, never none. Reserved means a `LICENSE` that says so; silence does not declare.

Every code file starts with:
// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: MIT (or the applicable ID)

**Consume:** MIT · ISC · BSD · Apache-2.0 · 0BSD · CC0-1.0 · CC-BY-4.0 freely.
MPL-2.0 · EPL-2.0 · LGPL-3.0 with isolation. **Third-party** GPL/AGPL only in a
separate repo with a signed decision. NEVER: BUSL, SSPL, Elastic, Commons Clause,
proprietary, CC-NC, CC-ND. Resolve every dependency's SPDX from the registry BEFORE
adding it — never from memory.

**Present is not distributed.** A forbidden transitive dependency that tree-shaking
keeps out of the artifact does NOT block work, but MUST be logged in `LEGAL_DEBT.md`
with an **exit threshold** (a condition, not a date, evaluated by CI on every build)
and guarded by a check that inspects the artifact's **contents** — bundler metafile or
module paths, never comment strings, which minifiers strip. Hard limit: **if that
licence imposes additional restrictions and the artifact is AGPL, no exception is
possible** — the result is unsatisfiable, not merely undesirable. A missing `license`
field is a hygiene signal, not a breach on its own: it blocks while the terms are
unknown and clears once you read the package's LICENSE and document them.

**Floor rule:** the strongest copyleft in the distributed tree sets the minimum
outbound license — one GPL import excludes MIT output. devDependencies and build tools
don't count; whatever ships in the client bundle does.

**Contributions:** any repo containing AGPL code requires a CLA (per repo, not per
path); MIT-only repos and docs use DCO (`git commit -s`); asset PRs need an explicit
CC0 declaration.

**Header exception:** never edit pinned third-party kits, vendored code, generated
artifacts or metadata-less binaries to insert an SPDX header — declare them in
`REUSE.toml` or an adjacent `.license` file.

**Repo skeleton on creation:** `LICENSE` · `LICENSES/` · `REUSE.toml` ·
`TRADEMARKS.md` · `NOTICE` if Apache-2.0 ships · `license` field in every
package.json. CI runs `license-check`: error on `.com`, warning on `.store`.

**Stop and ask — never proceed alone:**

- **Turning any repository public** — that IS the grant, before any `npm publish`.
  Gated and signed off, like Arweave. Verify the sensitive directories against a real
  listing, never a hand-written list.
- Publishing anything CC0 to Arweave (irreversible; gated; requires sign-off)
- Ownership of a piece is unclear or undocumented
- Files containing people, voices, or personal data — CC0 waives our rights, never
  someone else's
- Any license outside the lists above

**CI severity defaults to error.** Warning is the listed exception, for surfaces that
neither deploy to production nor publish. Severity follows exposure, not directory or
domain names; if exposure can't be determined, error.

Full canon: `C-005 · Canon de Licencias`. This block is authoritative for day-to-day
work; when it is silent, ask rather than infer.
