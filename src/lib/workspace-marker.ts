// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// What makes a repository in GITHUB_ORG a client workspace, and which
// purchase made it. Audit 2026-10-02: the organisation's name reaches the
// server through the payment's client_reference_id, which the buyer writes
// in the link; a name that matched ANY existing repository used to buy a
// viewer key to it. Two repository topics, set by /api/registro right after
// the repository is generated, close that:
//
//   · `nwos-workspace` — the repository is a workspace; the viewer routes
//     read nothing else (the public demo excepted, src/lib/demo.ts).
//   · `nwos-p-<hash>` — the purchase that created it: the first 128 bits of
//     SHA-256(session id), hex. Only that same session gets the key back on
//     a reload; the id itself never lands in the repository.
//
// GitHub topics: lowercase letters, digits and hyphens, at most 50 chars.

import { DEMO_WORKSPACE_SLUG } from "@/lib/demo";

export const WORKSPACE_TOPIC = "nwos-workspace";
const PURCHASE_PREFIX = "nwos-p-";

export async function purchaseTopic(sessionId: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`nwos-purchase:${sessionId}`));
	const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
	return PURCHASE_PREFIX + hex.slice(0, 32);
}

export function isWorkspace(topics: readonly string[] | undefined): boolean {
	return Array.isArray(topics) && topics.includes(WORKSPACE_TOPIC);
}

/** The existing repository was created by this very purchase. */
export async function madeByPurchase(topics: readonly string[] | undefined, sessionId: string): Promise<boolean> {
	return isWorkspace(topics) && topics!.includes(await purchaseTopic(sessionId));
}

/** Names a purchase can never take, whether or not a repository exists yet. */
export function isReservedSlug(slug: string, templateRepo: string): boolean {
	return slug === DEMO_WORKSPACE_SLUG || slug === templateRepo.toLowerCase();
}
