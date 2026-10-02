// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// Clave de acceso por workspace: HMAC-SHA256(slug) con un secreto del
// servidor. Se emite una sola vez en /api/registro y las rutas de lectura
// (/api/workspace/*) la exigen — sin ella los repos privados no son legibles.
//
// El secreto es WORKSPACE_KEY_SECRET y solo él. Auditoría 2026-10-02: el
// antiguo fallback al GITHUB_TOKEN ataba la clave del visor a la credencial
// que escribe toda la organización y seguía funcionando en silencio si el
// secreto propio nunca se configuraba. Sin él, las rutas responden
// "Missing configuration: WORKSPACE_KEY_SECRET" y no firman ni verifican nada.

const encoder = new TextEncoder();

export const MISSING_SIGNING_SECRET = "Missing configuration: WORKSPACE_KEY_SECRET";

export function keySecret(env: Env): string | null {
	return env.WORKSPACE_KEY_SECRET || null;
}

export async function signWorkspaceKey(slug: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`nwos-workspace:${slug}`));
	return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyWorkspaceKey(slug: string, candidate: string | null, secret: string): Promise<boolean> {
	if (!candidate) return false;
	const expected = await signWorkspaceKey(slug, secret);
	if (candidate.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) {
		diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
	}
	return diff === 0;
}
