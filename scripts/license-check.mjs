// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// Guardia de licencias del canon C-005 §5. Inspecciona el CONTENIDO del
// artefacto (dist/), nunca el árbol de dependencias ni comentarios (los
// minificadores los eliminan): los module paths salen de los sourcemaps
// que emite el build (astro.config.mjs → vite.build.sourcemap).
//
// Falla (exit 1) si el artefacto distribuye:
//   - un paquete con licencia de la lista NEVER, GPL/AGPL de terceros, o
//     de aislamiento (MPL/EPL/LGPL: empaquetado en el bundle = sin
//     aislamiento) — este artefacto es AGPL, así que una licencia con
//     restricciones adicionales no admite excepción alguna;
//   - un paquete sin licencia resoluble y sin términos documentados en
//     LEGAL_DEBT.md;
//   - un paquete listado en LEGAL_DEBT.md (su umbral de salida es
//     "ausente del artefacto"; presencia = umbral incumplido);
//   - fuentes (woff2/ttf/otf) sin el texto OFL acompañándolas en dist/.
//
// La severidad es error en todo: este artefacto se despliega a producción
// (canon: la severidad sigue a la exposición). Uso: node
// scripts/license-check.mjs (npm lo ejecuta como postbuild). Las funciones
// puras se exportan para los tests (vitest).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

// Canon C-005 «Consume ... freely». OFL-1.1 se admite solo si su texto
// acompaña a las fuentes en el artefacto (se comprueba aparte).
const ALLOWED = new Set([
  "MIT",
  "ISC",
  "BSD-2-CLAUSE",
  "BSD-3-CLAUSE",
  "BSD",
  "APACHE-2.0",
  "0BSD",
  "CC0-1.0",
  "CC-BY-4.0",
  "OFL-1.1",
]);
const ISOLATION_ONLY = /^(MPL-2\.0|EPL-2\.0|LGPL-3\.0(-only|-or-later)?)$/i;
const COPYLEFT_SEPARATE_REPO = /^(A?GPL)-[0-9.]+(-only|-or-later)?$/i;
const NEVER =
  /BUSL|SSPL|ELASTIC|COMMONS.?CLAUSE|-NC(-|$)|-ND(-|$)|UNLICENSED|PROPRIETARY/i;

// Evalúa una expresión SPDX simple: en OR basta una rama admisible, en AND
// deben serlo todas. Suficiente para lo que hay en npm; ante algo más
// exótico, cae al error de "no admisible" y se revisa a mano.
// Devuelve null si la expresión es admisible, o el problema como texto.
export function licenceProblem(expr) {
  const bare = expr.replace(/[()]/g, "").trim();
  if (/\sOR\s/i.test(bare)) {
    const branches = bare.split(/\sOR\s/i);
    const problems = branches.map((b) => licenceProblem(b));
    return problems.includes(null) ? null : problems.find(Boolean);
  }
  if (/\sAND\s/i.test(bare)) {
    for (const branch of bare.split(/\sAND\s/i)) {
      const problem = licenceProblem(branch);
      if (problem) return problem;
    }
    return null;
  }
  const id = bare.toUpperCase();
  if (NEVER.test(id)) return `licencia prohibida (${bare}): lista NEVER del canon`;
  if (COPYLEFT_SEPARATE_REPO.test(bare))
    return (
      `copyleft fuerte de terceros (${bare}): solo en repo separado con ` +
      `decisión firmada; además el artefacto es AGPL — sin excepción posible`
    );
  if (ISOLATION_ONLY.test(bare))
    return (
      `licencia de aislamiento (${bare}) dentro del bundle: empaquetado ` +
      `junto al resto no hay aislamiento`
    );
  if (!ALLOWED.has(id)) return `licencia no admisible o desconocida (${bare})`;
  return null;
}

// Nombre de paquete npm a partir de un source path de sourcemap, o null
// si el source no viene de node_modules (código propio, módulo virtual).
export function packageFromSource(source) {
  const idx = source.lastIndexOf("node_modules/");
  if (idx === -1) return null;
  const rest = source.slice(idx + "node_modules/".length);
  const segments = rest.split("/");
  const pkg = segments[0].startsWith("@")
    ? `${segments[0]}/${segments[1]}`
    : segments[0];
  if (!pkg || pkg.startsWith(".")) return null;
  return pkg;
}

// Entradas de LEGAL_DEBT.md: | package | verified-licence | kind | notes |.
// Cada una declara o bien que el paquete está en el árbol pero NO se
// distribuye (umbral evaluado en main), o bien que su package.json no
// declara licencia pero los términos ya se leyeron ("terms-verified").
export function parseLegalDebt(markdown) {
  const entries = new Map();
  for (const line of markdown.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 5 || cells[1] === "Package" || /^-+$/.test(cells[1]))
      continue;
    if (!cells[1]) continue;
    entries.set(cells[1], { licence: cells[2], kind: cells[3] });
  }
  return entries;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function resolveLicence(pkg) {
  const pkgJsonPath = path.join(root, "node_modules", pkg, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return null;
  const meta = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  if (typeof meta.license === "string") return meta.license;
  if (meta.license?.type) return meta.license.type;
  if (Array.isArray(meta.licenses))
    return meta.licenses.map((l) => l.type ?? l).join(" OR ");
  return null;
}

function main() {
  const errors = [];

  if (!fs.existsSync(distDir)) {
    console.error(
      "license-check: dist/ no existe — ejecuta `npm run build` antes."
    );
    process.exit(1);
  }

  const distFiles = [...walk(distDir)];

  // --- 1. Module paths del artefacto, vía sourcemaps ----------------------

  const maps = distFiles.filter((f) => f.endsWith(".map"));
  if (maps.length === 0) {
    errors.push(
      "el build no emitió sourcemaps: sin ellos la guardia no puede inspeccionar " +
        "el contenido del artefacto (revisa vite.build.sourcemap en astro.config.mjs)"
    );
  }

  // nombre de paquete → Set de archivos del artefacto que lo incluyen
  const shipped = new Map();
  for (const mapFile of maps) {
    let sources;
    try {
      sources = JSON.parse(fs.readFileSync(mapFile, "utf-8")).sources ?? [];
    } catch {
      errors.push(`sourcemap ilegible: ${path.relative(root, mapFile)}`);
      continue;
    }
    for (const source of sources) {
      const pkg = packageFromSource(source);
      if (!pkg) continue;
      if (!shipped.has(pkg)) shipped.set(pkg, new Set());
      shipped
        .get(pkg)
        .add(path.relative(distDir, mapFile).replace(/\.map$/, ""));
    }
  }

  // --- 2. Excepciones documentadas (LEGAL_DEBT.md) ------------------------

  const debtPath = path.join(root, "LEGAL_DEBT.md");
  const legalDebt = fs.existsSync(debtPath)
    ? parseLegalDebt(fs.readFileSync(debtPath, "utf-8"))
    : new Map();

  // --- 3. Clasificación de cada paquete distribuido -----------------------

  for (const [pkg, files] of [...shipped.entries()].sort()) {
    const where = `distribuido en ${[...files].slice(0, 3).join(", ")}`;
    const debt = legalDebt.get(pkg);

    if (debt && debt.kind !== "terms-verified") {
      errors.push(
        `${pkg}: umbral de LEGAL_DEBT.md incumplido — el paquete aparece en el ` +
          `artefacto (${where}); la excepción solo valía mientras no se distribuyera`
      );
      continue;
    }

    const licence = resolveLicence(pkg) ?? debt?.licence ?? null;
    if (!licence) {
      errors.push(
        `${pkg}: sin campo license resoluble (${where}); lee su LICENSE y ` +
          `documenta los términos en LEGAL_DEBT.md (kind terms-verified) o retíralo`
      );
      continue;
    }
    const problem = licenceProblem(licence);
    if (problem) errors.push(`${pkg}: ${problem} — ${where}`);
  }

  // --- 4. Fuentes: la OFL exige que su texto acompañe a los binarios ------

  const fontFiles = distFiles.filter((f) => /\.(woff2?|ttf|otf)$/i.test(f));
  if (fontFiles.length > 0) {
    const oflShipped = distFiles.some(
      (f) =>
        /\.(txt|md)$/i.test(f) &&
        fs.readFileSync(f, "utf-8").includes("SIL OPEN FONT LICENSE Version 1.1")
    );
    if (!oflShipped) {
      errors.push(
        `el artefacto distribuye ${fontFiles.length} archivo(s) de fuente pero ` +
          `ningún texto OFL-1.1 los acompaña (esperado: public/licenses/OFL-1.1.txt → dist/)`
      );
    }
  }

  // --- Veredicto ----------------------------------------------------------

  console.log(
    `license-check: ${shipped.size} paquetes en el artefacto, ` +
      `${maps.length} sourcemaps, ${fontFiles.length} fuentes, ` +
      `${legalDebt.size} entradas en LEGAL_DEBT.md`
  );
  if (errors.length > 0) {
    for (const error of errors) console.error(`  ERROR ${error}`);
    process.exit(1);
  }
  console.log("license-check: OK");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
