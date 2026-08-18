// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// El REUSE.toml del molde declara en su cabecera, como spec legible por
// máquina, qué artefactos son solo del molde (y se retiran del repo
// generado) y qué archivo se renombra a LICENSE. Se lee del repo generado
// en cada deploy: dos fuentes de verdad para el mismo hecho es como un
// artefacto nuevo del molde (LEGAL_DEBT.md) llegó a heredarse. Formato:
//
//   # Mould-only artifacts, stripped by nwos-deploy after generation:
//   #   LICENSE, LICENSES/, REUSE.toml, TRADEMARKS.md, LEGAL_DEBT.md
//   # Renamed by nwos-deploy after generation:
//   #   LICENSE.client -> LICENSE (placeholders resolved)

export interface MouldSpec {
	strip: string[];
	renameFrom: string;
	renameTo: string;
}

// Devuelve null si el spec no aparece o no es coherente: el deploy debe
// abortar, nunca adivinar una lista.
export function parseMouldSpec(reuseToml: string): MouldSpec | null {
	const lines = reuseToml.split("\n").map((line) => line.replace(/^#\s?/, "").trim());

	const stripIdx = lines.findIndex((line) => line.startsWith("Mould-only artifacts, stripped by nwos-deploy"));
	const renameIdx = lines.findIndex((line) => line.startsWith("Renamed by nwos-deploy"));
	if (stripIdx === -1 || renameIdx === -1) return null;

	const strip: string[] = [];
	for (let i = stripIdx + 1; i < renameIdx; i++) {
		strip.push(
			...lines[i]
				.split(",")
				.map((entry) => entry.trim().replace(/\/$/, ""))
				.filter(Boolean),
		);
	}

	const rename = lines[renameIdx + 1]?.match(/^(\S+)\s*->\s*(\S+)/);
	if (!rename || strip.length === 0) return null;
	const [, renameFrom, renameTo] = rename;
	if (renameFrom === renameTo) return null;

	return {
		// Defensivo: el archivo a renombrar nunca forma parte del strip.
		strip: strip.filter((path) => path !== renameFrom),
		renameFrom,
		renameTo,
	};
}

// Entrada: entradas del árbol recursivo de HEAD tal como las da GitHub.
export interface HeadTreeEntry {
	path?: string;
	mode?: string;
	type?: string;
	sha?: string | null;
}

// Salida: entradas para POST /git/trees (sin base_tree, GitHub reconstruye
// los directorios a partir de los blobs).
export interface InstallTreeEntry {
	path: string;
	mode: "100644" | "100755" | "040000" | "160000" | "120000";
	type: "blob" | "tree" | "commit";
	sha?: string | null;
	content?: string;
}

/**
 * Árbol del commit único que instala la licencia del cliente: retira los
 * artefactos del spec (por ruta exacta o prefijo de directorio), renombra
 * renameFrom → renameTo conservando su blob — ya personalizado por el bucle
 * anterior — y añade PROVENANCE.md. Un solo commit vía Git Data API en vez
 * de un borrado por archivo con la API de contents: el número de
 * subrequests deja de depender del tamaño del spec del molde (MIS-090).
 * Lanza si renameFrom no está en HEAD: el deploy debe abortar.
 */
export function buildInstallTree(headTree: HeadTreeEntry[], spec: MouldSpec, provenance: string): InstallTreeEntry[] {
	const stripped = (path: string) => spec.strip.some((artifact) => path === artifact || path.startsWith(`${artifact}/`));

	const renameEntry = headTree.find((entry) => entry.type === "blob" && entry.path === spec.renameFrom);
	if (!renameEntry?.sha) {
		throw new Error(`${spec.renameFrom} missing from the generated repo's HEAD tree`);
	}

	const kept = headTree.filter((entry): entry is Required<Pick<HeadTreeEntry, "path" | "mode" | "type">> & HeadTreeEntry => entry.type !== "tree" && !!entry.path && !!entry.mode && entry.path !== spec.renameFrom && entry.path !== spec.renameTo && entry.path !== "PROVENANCE.md" && !stripped(entry.path));

	return [
		...kept.map((entry) => ({
			path: entry.path,
			mode: entry.mode as InstallTreeEntry["mode"],
			type: entry.type as InstallTreeEntry["type"],
			sha: entry.sha,
		})),
		{ path: spec.renameTo, mode: "100644", type: "blob", sha: renameEntry.sha },
		{ path: "PROVENANCE.md", mode: "100644", type: "blob", content: provenance },
	];
}
