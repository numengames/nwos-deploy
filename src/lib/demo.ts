// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// MIS-090: el workspace demo congelado. Su repo se generó UNA vez con el
// flujo real y está archivado en GitHub — las rutas de lectura lo sirven
// sin access key, y solo a él. Nada en la ruta de visualización llama a
// la API de Anthropic.

export const DEMO_WORKSPACE_SLUG = "faro-austral";

export function isDemoWorkspace(slug: string | undefined): boolean {
	return slug === DEMO_WORKSPACE_SLUG;
}
