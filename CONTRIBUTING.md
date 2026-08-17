# Contributing

Thanks for contributing to `nwos-deploy`. Two legal requirements apply to
every contribution; both come from Numinia canon C-005 and are enforced by
CI.

## 1. Sign the CLA (required for all contributions)

This repository contains `AGPL-3.0-only` code, so it requires a Contributor
License Agreement — per repository, not per path. Documentation-only and
configuration-only changes need it too (DCO sign-off is **not** sufficient
here; DCO applies to Numen's MIT-only repositories).

To sign, once, in your first pull request:

1. Read [CLA.md](CLA.md).
2. Add a row for yourself to [CLA-SIGNATORIES.md](CLA-SIGNATORIES.md) in a
   commit authored by you (same GitHub account as the PR).

CI fails pull requests whose author is not listed in `CLA-SIGNATORIES.md`.

## 2. Licensing rules for what you add

- Every new code file starts with the SPDX header used across the repo
  (`SPDX-FileCopyrightText: 2026 Numen Games S.L.` +
  `SPDX-License-Identifier: AGPL-3.0-only` for application code). Files
  that cannot carry a header (JSON, binaries) are declared in
  [REUSE.toml](REUSE.toml) instead — never edit vendored or generated
  files to insert headers.
- New dependencies: resolve the package's SPDX license from the registry
  **before** adding it — never from memory. Allowed freely: MIT, ISC, BSD,
  Apache-2.0, 0BSD, CC0-1.0, CC-BY-4.0. Never: BUSL, SSPL, Elastic,
  Commons Clause, proprietary, CC-NC, CC-ND, or third-party GPL/AGPL.
  `npm run build` runs `license-check`, which inspects the built artifact
  and fails on violations; see [LEGAL_DEBT.md](LEGAL_DEBT.md) for the only
  documented-exception path.
- Asset contributions (images, fonts, audio, data) need an explicit CC0
  declaration in the PR description, and must not contain people, voices,
  or personal data.

## Development

- `npm run dev` — dev server at http://localhost:4321
- `npm run build` — production build + `license-check`
- `npm run preview` — serve the production build via `wrangler dev`

See [CLAUDE.md](CLAUDE.md) for architecture notes.
