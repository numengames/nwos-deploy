// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// Regenera la URL del visor de un workspace a partir del secreto del
// servidor (.env local). Uso: node scripts/workspace-key.mjs <slug>
import crypto from "node:crypto";
import fs from "node:fs";

const slug = process.argv[2];
if (!slug) {
	console.error("Uso: node scripts/workspace-key.mjs <slug>");
	process.exit(1);
}

const env = Object.fromEntries(
	fs
		.readFileSync(".env", "utf8")
		.split("\n")
		.filter((l) => /^[A-Z_]+=/.test(l))
		.map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const secret = env.WORKSPACE_KEY_SECRET || env.GITHUB_TOKEN;
const key = crypto
	.createHmac("sha256", secret)
	.update(`nwos-workspace:${slug}`)
	.digest("hex");

console.log(`https://nwos.numen.games/workspace/${slug}?key=${key}`);
