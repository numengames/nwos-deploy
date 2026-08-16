// Clave de acceso por workspace: HMAC-SHA256(slug) con un secreto del
// servidor. Se emite una sola vez en /api/registro y las rutas de lectura
// (/api/workspace/*) la exigen — sin ella los repos privados no son legibles.
// Si no hay WORKSPACE_KEY_SECRET configurado se deriva del GITHUB_TOKEN para
// no requerir un secret adicional.

const encoder = new TextEncoder();

export function keySecret(env: Env): string {
	return env.WORKSPACE_KEY_SECRET || env.GITHUB_TOKEN;
}

export async function signWorkspaceKey(
	slug: string,
	secret: string,
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(`nwos-workspace:${slug}`),
	);
	return [...new Uint8Array(sig)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function verifyWorkspaceKey(
	slug: string,
	candidate: string | null,
	secret: string,
): Promise<boolean> {
	if (!candidate) return false;
	const expected = await signWorkspaceKey(slug, secret);
	if (candidate.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) {
		diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
	}
	return diff === 0;
}
