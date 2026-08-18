// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
/// <reference types="astro/client" />

type Env = {
	GITHUB_ORG: string;
	GITHUB_TOKEN: string;
	GITHUB_TEMPLATE_REPO: string;
	ANTHROPIC_API_KEY: string;
	// Opcional: secreto para firmar las claves de acceso a los workspaces.
	// Si falta, se deriva del GITHUB_TOKEN (ver src/lib/token.ts).
	WORKSPACE_KEY_SECRET?: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
	// Astro's documented pattern for typing locals; the empty body is the point.
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface Locals extends Runtime {}
}

// The fontsource packages ship CSS only: a side-effect import needs a stub.
declare module "@fontsource-variable/geist";
declare module "@fontsource-variable/geist-mono";
