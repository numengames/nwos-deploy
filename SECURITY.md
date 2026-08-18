<!--
SPDX-FileCopyrightText: 2026 Numen Games S.L.
SPDX-License-Identifier: CC-BY-4.0
-->

# Security Policy

## Supported versions

This repository deploys a single production surface — https://nwos.numen.games — from the `main` branch. Only the currently deployed `main` is supported.

The service holds credentials that create repositories in a GitHub organization. Treat anything touching `GITHUB_TOKEN`, workspace access keys, or the `/api/*` routes as high severity.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

- Preferred: [GitHub private vulnerability reporting](https://github.com/numengames/nwos-deploy/security/advisories/new).
- Alternative: email **hello@numen.games** with `SECURITY` in the subject.

Include what you found, how to reproduce it, the impact, and any suggested fix.

## What to expect

| Stage                                    | Target                            |
| ---------------------------------------- | --------------------------------- |
| Acknowledgement                          | 3 working days                    |
| First assessment (valid / not, severity) | 10 working days                   |
| Fix or documented mitigation             | 30 days, sooner for high severity |

We credit reporters in the advisory unless they prefer otherwise.

## Scope

In scope: this repository's source and build output, the Cloudflare Worker it deploys, the `/api/registro` and `/api/workspace/*` routes, the workspace access-key scheme (`src/lib/token.ts`), and the workspaces generated from the template.

Out of scope: volumetric denial of service, missing hardening headers with no demonstrated impact, scanner output without a working proof of concept, and issues in GitHub or Cloudflare themselves — report those to them.

## Safe harbour

Research in good faith under this policy will not be pursued: no privacy violations, no data destruction, no service degradation, no access beyond what demonstrates the issue. **Do not create workspaces in the production organization to test** — describe the request instead. Give us reasonable time to fix before public disclosure.
