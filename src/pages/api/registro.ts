// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";
import { getEnv } from "@/lib/env";
import { keySecret, signWorkspaceKey } from "@/lib/token";
import { parseMouldSpec } from "@/lib/mould";

export function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Sin comillas, backticks, llaves ni saltos de línea: companyName se
// interpola en los prompts del agente y en contenido commiteado al repo.
const COMPANY_NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .,&'()+-]{1,59}$/u;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

export const prerender = false;

const DOCUMENTS = [
  {
    path: "canon/C-001-mission-vision-values.md",
    prompt: `Research the company "{companyName}" and write their Mission, Vision, and Values document.
Search the web for their official website, LinkedIn, press releases, and any public information.
If you cannot find specific information, create a professional draft based on their industry and positioning that the company can refine later.
Write in Spanish. Use Markdown formatting.
Structure:
# Mission
# Vision
# Values (list 5-7 core values with brief descriptions)
Mark any section where you had to infer (rather than find real data) with <!-- NEEDS REVIEW --> at the end of that section.`,
  },
  {
    path: "canon/C-002-culture.md",
    prompt: `Research the company "{companyName}" and write their Culture document.
Search the web for their career pages, Glassdoor, social media, and any public culture-related content.
If you cannot find specific information, create a professional draft based on their industry.
Write in Spanish. Use Markdown formatting.
Structure:
# Culture Principles
# How We Work
# Communication Style
Mark any section where you had to infer with <!-- NEEDS REVIEW -->.`,
  },
  {
    path: "canon/C-003-org-structure.md",
    prompt: `Research the company "{companyName}" and write their Organizational Structure document.
Search the web for their LinkedIn company page, team page, leadership bios, and org charts.
If you cannot find specific information, create a reasonable draft based on company size and industry.
Write in Spanish. Use Markdown formatting.
Structure:
# Leadership Team
# Departments / Areas
# Key Roles
Mark any section where you had to infer with <!-- NEEDS REVIEW -->.`,
  },
  {
    path: "canon/C-004-glossary.md",
    prompt: `Research the company "{companyName}" and create a domain-specific Glossary.
Search the web to understand their industry, products, and terminology.
Write in Spanish. Use Markdown formatting.
Structure:
# Glossary
A table with columns: Term | Definition | Context
Include 15-25 terms relevant to their industry and operations.
Mark the document with <!-- NEEDS REVIEW --> if most terms are inferred.`,
  },
] as const;

// PROVENANCE.md del workspace (aprobado en principio por el oráculo):
// declara cómo se generaron los documentos canon. Un solo artefacto
// localizable, no una cabecera por documento. La parte contractual va
// marcada [ABOGADO]: la fija el contrato tras revisión de asesoría, no
// este archivo. Se personaliza con los mismos reemplazos que el resto.
const PROVENANCE_TEMPLATE = `# Procedencia de los documentos canon

Los documentos de \`canon/\` fueron generados el {{DEPLOY_DATE}} por un
sistema de IA (Claude, de Anthropic) con búsqueda web, por encargo de
{{COMPANY_NAME}}.

Son **borradores para revisión humana**: las secciones inferidas están
marcadas \`<!-- NEEDS REVIEW -->\`, y el contenido puede derivar de
fuentes públicas que deben verificarse antes de cualquier uso externo.
Las versiones revisadas y editadas por {{COMPANY_NAME}} son obra suya a
todos los efectos.

<!-- [ABOGADO] Redacción contractual pendiente de asesoría jurídica; los
compromisos los fija el contrato, no este archivo. -->
En la medida en que exista algún derecho sobre estos textos, Numen Games
S.L. lo cede íntegramente a {{COMPANY_NAME}} y se obliga a no conservar
ni reutilizar copias.
`;

async function generateContent(
  client: Anthropic,
  companyName: string,
  promptTemplate: string
): Promise<string> {
  const prompt = promptTemplate.replace(/\{companyName\}/g, companyName);

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    // Sonnet 5 piensa por defecto y max_tokens cubre pensamiento + texto:
    // hace falta margen para que la respuesta no llegue truncada.
    max_tokens: 16000,
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
      },
    ],
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  return text.trim();
}

// Borra un path del repo si existe (404 = el molde no trae ese artefacto).
// Los directorios se recorren y borran archivo a archivo: la contents API
// de GitHub no borra directorios enteros.
async function deletePathIfPresent(
  octokit: Octokit,
  org: string,
  repo: string,
  path: string,
  message: string
): Promise<void> {
  let data: any;
  try {
    ({ data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner: org, repo, path }
    ));
  } catch (error: any) {
    if (error?.status === 404) return;
    throw error;
  }

  for (const entry of Array.isArray(data) ? data : [data]) {
    if (entry.type === "dir") {
      await deletePathIfPresent(octokit, org, repo, entry.path, message);
    } else {
      await octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", {
        owner: org,
        repo,
        path: entry.path,
        message,
        sha: entry.sha,
      });
    }
  }
}

async function commitFile(
  octokit: Octokit,
  org: string,
  repo: string,
  path: string,
  content: string,
  message: string
) {
  const { data: fileData } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    { owner: org, repo, path }
  );

  await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner: org,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    sha: (fileData as any).sha,
  });
}

async function updateStatus(
  octokit: Octokit,
  org: string,
  repo: string,
  completedDocs: string[],
  allDocs: string[],
  isFinished: boolean
) {
  const progress = allDocs
    .map((doc) => {
      const name = doc.split("/").pop()?.replace(".md", "") || doc;
      const done = completedDocs.includes(doc);
      return `- [${done ? "x" : " "}] ${name}`;
    })
    .join("\n");

  const statusContent = `# Workspace Status

- **Agent status:** ${isFinished ? "✅ Complete" : "🔄 Populating..."}
- **Last updated:** ${new Date().toISOString()}

## Progress

${progress}
`;

  try {
    await commitFile(
      octokit,
      org,
      repo,
      "STATUS.md",
      statusContent,
      isFinished
        ? "Agent: population complete"
        : `Agent: progress update (${completedDocs.length}/${allDocs.length})`
    );
  } catch {
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: org,
      repo,
      path: "STATUS.md",
      message: "Agent: initial status",
      content: Buffer.from(statusContent).toString("base64"),
    });
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Cuerpo de la petición no válido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const companyName =
      typeof body?.companyName === "string" ? body.companyName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const acceptedTerms = body?.acceptedTerms === true;

    if (!companyName || !email || !acceptedTerms) {
      return new Response(
        JSON.stringify({ error: "Todos los campos son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!COMPANY_NAME_RE.test(companyName)) {
      return new Response(
        JSON.stringify({
          error:
            "Nombre de organización no válido: usa 2-60 caracteres (letras, números, espacios y . , & ' ( ) + -)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Email no válido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const slug = sanitize(companyName);
    if (slug.length < 2) {
      return new Response(
        JSON.stringify({
          error: "El nombre debe contener al menos 2 caracteres alfanuméricos (a-z, 0-9)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const env = getEnv(locals);
    const org = env.GITHUB_ORG;
    const templateRepo = env.GITHUB_TEMPLATE_REPO;
    const token = env.GITHUB_TOKEN;
    const anthropicKey = env.ANTHROPIC_API_KEY;

    if (!org || !templateRepo || !token || !anthropicKey) {
      const missing = [
        !org && "GITHUB_ORG",
        !templateRepo && "GITHUB_TEMPLATE_REPO",
        !token && "GITHUB_TOKEN",
        !anthropicKey && "ANTHROPIC_API_KEY",
      ]
        .filter(Boolean)
        .join(", ");
      const runtimeKeys = Object.keys(
        (locals as any).runtime?.env ?? {}
      ).join(",");
      console.error(
        `Missing env vars: ${missing} — runtime env keys: [${runtimeKeys || "runtime ausente o vacío"}]`
      );
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const octokit = new Octokit({ auth: token });
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Create repo from template. El 422 de "name already exists" solo puede
    // venir de esta llamada — no lo mapeamos desde el catch global, donde un
    // 422 posterior (p.ej. commit) daría un mensaje falso.
    try {
      await octokit.request(
        "POST /repos/{template_owner}/{template_repo}/generate",
        {
          template_owner: org,
          template_repo: templateRepo,
          owner: org,
          name: slug,
          private: true,
          description: `NWOS Workspace for ${companyName}`,
        }
      );
    } catch (error: any) {
      if (error?.status === 422) {
        return new Response(
          JSON.stringify({ error: "Ya existe un workspace con ese nombre" }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    // Wait for GitHub to finish copying files
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Leer el spec del molde desde el propio repo generado: qué artefactos
    // §5 se retiran y qué archivo pasa a ser el LICENSE del cliente. Es la
    // única fuente de verdad; sin spec coherente el deploy aborta en vez
    // de adivinar la lista.
    let mouldSpec: ReturnType<typeof parseMouldSpec> = null;
    try {
      const { data: reuseData } = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        { owner: org, repo: slug, path: "REUSE.toml" }
      );
      mouldSpec = parseMouldSpec(
        Buffer.from((reuseData as any).content, "base64").toString("utf-8")
      );
      if (!mouldSpec) {
        console.error(
          `Aborting deploy of ${org}/${slug}: REUSE.toml carries no parseable mould spec`
        );
      }
    } catch (e) {
      console.error(
        `Aborting deploy of ${org}/${slug}: cannot read REUSE.toml from generated repo:`,
        e
      );
    }
    if (!mouldSpec) {
      return new Response(
        JSON.stringify({
          error:
            "El despliegue se ha abortado: la plantilla no declara sus artefactos de licencia. Se ha creado un repositorio parcial; contacta con el equipo antes de reintentar.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Personalize files — replace placeholders with real data.
    // Solo archivos raíz del workspace: los _template/ del repo generado
    // llevan placeholders a propósito y no deben tocarse.
    // La futura licencia del cliente va primero: si falta o no se puede
    // personalizar, el deploy aborta antes de tocar nada más (ver el
    // catch del bucle).
    const filesToPersonalize = [
      mouldSpec.renameFrom,
      "README.md",
      "CHANGELOG.md",
      "web/index.html",
      "canon/C-001-mission-vision-values.md",
      "canon/C-002-culture.md",
      "canon/C-003-org-structure.md",
      "canon/C-004-glossary.md",
    ];

    for (const filePath of filesToPersonalize) {
      try {
        const { data: fileData } = await octokit.request(
          "GET /repos/{owner}/{repo}/contents/{path}",
          { owner: org, repo: slug, path: filePath }
        );

        const content = Buffer.from(
          (fileData as any).content,
          "base64"
        ).toString("utf-8");

        const deployDate = new Date().toISOString().split("T")[0];
        const updated = content
          .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
          .replace(/\{\{RESPONSIBLE_EMAIL\}\}/g, email)
          .replace(/\{\{DEPLOY_DATE\}\}/g, deployDate)
          // {{DATE}} solo aparece en CHANGELOG.md entre los archivos de esta
          // lista; en los _template/ debe sobrevivir, pero esos no se tocan.
          .replace(/\{\{DATE\}\}/g, deployDate);

        await octokit.request(
          "PUT /repos/{owner}/{repo}/contents/{path}",
          {
            owner: org,
            repo: slug,
            path: filePath,
            message: `Personalize ${filePath} for ${companyName}`,
            content: Buffer.from(updated).toString("base64"),
            sha: (fileData as any).sha,
          }
        );
      } catch (e) {
        // renameFrom (LICENSE.client) es la licencia que se entrega al
        // cliente: si no existe en el repo generado o no se puede
        // personalizar, abortar. Un workspace sin ella acabaría con la
        // licencia MIT del molde o sin LICENSE — peor que un deploy
        // fallido (canon C-005).
        if (filePath === mouldSpec.renameFrom) {
          console.error(
            `Aborting deploy of ${org}/${slug}: ${mouldSpec.renameFrom} missing or personalization failed:`,
            e
          );
          return new Response(
            JSON.stringify({
              error:
                "El despliegue se ha abortado: no se pudo preparar la licencia del workspace. Se ha creado un repositorio parcial; contacta con el equipo antes de reintentar.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        console.warn(`Skipping ${filePath}:`, e);
      }
    }

    // Instalar la licencia del cliente. El molde nunca propaga su propia
    // licencia al trabajo generado (canon C-005): se retiran los artefactos
    // que su spec declara y renameFrom — ya verificado y personalizado por
    // el bucle anterior — pasa a ser el LICENSE del workspace, con derechos
    // reservados a nombre del cliente. También se deja PROVENANCE.md, que
    // declara cómo se generaron los canon. Cualquier fallo aquí aborta.
    try {
      // Releer renameFrom: confirma que sigue ahí antes del strip y da el
      // sha fresco tras la personalización.
      const { data: licenseData } = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        { owner: org, repo: slug, path: mouldSpec.renameFrom }
      );
      const licenseContent = Buffer.from(
        (licenseData as any).content,
        "base64"
      ).toString("utf-8");
      if (/\{\{(COMPANY_NAME|DEPLOY_DATE)\}\}/.test(licenseContent)) {
        throw new Error(
          `${mouldSpec.renameFrom} conserva placeholders sin personalizar`
        );
      }

      for (const artifact of mouldSpec.strip) {
        await deletePathIfPresent(
          octokit,
          org,
          slug,
          artifact,
          `Strip template licensing artifact ${artifact}`
        );
      }

      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: org,
        repo: slug,
        path: mouldSpec.renameTo,
        message: `Install client ${mouldSpec.renameTo} for ${companyName}`,
        content: Buffer.from(licenseContent).toString("base64"),
      });

      await octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", {
        owner: org,
        repo: slug,
        path: mouldSpec.renameFrom,
        message: `Remove ${mouldSpec.renameFrom} after installing client ${mouldSpec.renameTo}`,
        sha: (licenseData as any).sha,
      });

      const provenance = PROVENANCE_TEMPLATE.replace(
        /\{\{COMPANY_NAME\}\}/g,
        companyName
      ).replace(/\{\{DEPLOY_DATE\}\}/g, new Date().toISOString().split("T")[0]);
      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: org,
        repo: slug,
        path: "PROVENANCE.md",
        message: `Declare canon provenance for ${companyName}`,
        content: Buffer.from(provenance).toString("base64"),
      });
    } catch (e) {
      console.error(
        `Aborting deploy of ${org}/${slug}: client LICENSE install failed:`,
        e
      );
      return new Response(
        JSON.stringify({
          error:
            "El despliegue se ha abortado: no se pudo instalar la licencia del workspace. Se ha creado un repositorio parcial; contacta con el equipo antes de reintentar.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Run agent population inline (user waits)
    const allPaths = DOCUMENTS.map((d) => d.path);
    const completedPaths: string[] = [];

    for (const doc of DOCUMENTS) {
      try {
        const content = await generateContent(anthropic, companyName, doc.prompt);

        await commitFile(
          octokit,
          org,
          slug,
          doc.path,
          content,
          `Agent: populate ${doc.path} for ${companyName}`
        );

        completedPaths.push(doc.path);
        await updateStatus(octokit, org, slug, completedPaths, allPaths, false);
      } catch (e) {
        console.error(`Error populating ${doc.path}:`, e);
      }
    }

    try {
      await updateStatus(octokit, org, slug, completedPaths, allPaths, true);
    } catch (e) {
      // El workspace ya está creado y poblado; un fallo aquí no debe
      // convertir el deploy en un error de cara al usuario.
      console.error("Final STATUS.md update failed:", e);
    }

    const repoUrl = `https://github.com/${org}/${slug}`;
    const accessKey = await signWorkspaceKey(slug, keySecret(env));

    return new Response(
      JSON.stringify({ success: true, slug, repoUrl, accessKey }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Deploy error:", error);

    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
