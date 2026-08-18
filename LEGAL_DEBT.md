# Legal debt register

Documented exceptions per canon C-005 §5: "present is not distributed."
`scripts/license-check.mjs` parses this table on every build and evaluates
each entry's exit threshold against the artifact's **contents** (module
paths from sourcemaps — never comment strings).

Two kinds of entry:

- `not-distributed` — a forbidden or unknown-licence package sits in the
  dependency tree but tree-shaking keeps it out of `dist/`. The exit
  threshold is fixed and CI-evaluable: **absent from the artifact**. The
  moment the package appears in any bundle, the build fails. Hard limit:
  this artifact is AGPL, so a licence that imposes additional restrictions
  admits **no** exception once distributed — the result is unsatisfiable.
- `terms-verified` — the package ships but its `package.json` has no
  resolvable `license` field. The entry records the licence actually found
  by reading the package's LICENSE file; the recorded licence must itself
  be admissible. This clears the hygiene block; it is not a forbidden-
  licence exception.

| Package | Verified licence | Kind | Exit threshold / notes |
| ------- | ---------------- | ---- | ---------------------- |

_(No entries. Rows must keep this column order — the checker parses them.)_
