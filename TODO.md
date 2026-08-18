<!--
SPDX-FileCopyrightText: 2026 Numen Games S.L.
SPDX-License-Identifier: CC-BY-4.0
-->

# TODO

The roadmap is a file in the repository (PM-05). Everything here is observed
debt: what it is, and what would close it.

## Oracle-gated — do not start autonomously

- [ ] **Branch protection on `main` (ARC-02, DEV-07).** Required PR, required
      status checks (`pipeline`, `presence`, `license-check`, `cla`), no force
      push, verified commits (SEC-12).
- [ ] **Organization settings.** 2FA (SEC-01), base permission read (SEC-11),
      secret scanning + push protection (SEC-02).
- [ ] **OIDC for deploys (SEC-05).** Production still deploys from a local
      `wrangler deploy` with a long-lived token. Target: GitHub → Cloudflare
      via OIDC, no stored credential.
- [ ] **Repo "About" (PM-01).** The website field is empty; it should point at
      https://nwos.numen.games. Topics ≥ 3.
- [ ] **Social preview image (OSS-05).**

## Design system

- [ ] **`DESIGN.md` consolidation.** Marked superseded; it still carries its
      inherited title (_pablofm.com_) and a palette that no longer exists in
      the code. Waiting on the Oracle's keep-list before trimming it to the
      product-specific rules the master does not cover.
- [ ] **Legacy token names.** `--terracota`, `--ocre`, `--cobre`, `--bronce`,
      `--salvia`, `--azul-med`, `--teal` now hold canonical §19.3 values but
      keep their old flavour names. Rename to the canonical vocabulary.
- [ ] **Iconography (§7).** The system asks for Phosphor with a declared
      subset; the components use inline SVG paths. Audit and align.
- [ ] **`accent` is Verdemar, `interactivo` is Turquesa.** A few surfaces still
      use `bg-accent/10` as a soft action tint where a proper ghost button
      (§9.1) would be the canonical piece.

## Engineering

- [ ] **Health check endpoint (SRE-02)** and a **runbook** (SRE-04): deploy,
      rollback, common failures — including what to do when a deploy aborts
      halfway and leaves a partial workspace repository.
- [ ] **Rollback rehearsal (SRE-01).** Documented and tested at least once.
- [ ] **ADRs (ARC-05).** `docs/decisions/` does not exist yet.
- [ ] **Shared base config (ARC-08).** `tsconfig` / `eslint` / `prettier` are
      copies; they should come from one package shared across repos.
- [ ] **Pre-commit hooks (DEV-04).** husky + lint-staged, under 5s.
- [ ] **Conventional commits enforced (ARC-06)** and releases generated from
      them; the repo has no `CHANGELOG.md`.
- [ ] **`WorkspaceViewer` data loading.** Two `react-hooks` rules are silenced
      on the load-on-mount effect. Moving to a data-fetching primitive would
      remove both disables.
- [ ] **`prettier-plugin-astro` cannot parse `src/components/Navigation.astro`**
      (pre-existing, reproduced on the file as it was before this work). It is
      in `.prettierignore`; revisit on the next plugin release.
- [ ] **Test coverage thresholds (§3.2).** `vitest` runs, but no threshold is
      enforced as a failure.
