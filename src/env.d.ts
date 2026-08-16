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
	interface Locals extends Runtime {}
}
