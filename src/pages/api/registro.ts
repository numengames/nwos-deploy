import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

async function generateContent(
  client: Anthropic,
  companyName: string,
  promptTemplate: string
): Promise<string> {
  const prompt = promptTemplate.replace(/\{companyName\}/g, companyName);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    tools: [
      {
        type: "web_search_20250305",
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const { companyName, email, acceptedTerms } = await request.json();

    if (!companyName || !email || !acceptedTerms) {
      return new Response(
        JSON.stringify({ error: "Todos los campos son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const slug = sanitize(companyName);
    const org = import.meta.env.GITHUB_ORG;
    const templateRepo = import.meta.env.GITHUB_TEMPLATE_REPO;
    const token = import.meta.env.GITHUB_TOKEN;
    const anthropicKey = import.meta.env.ANTHROPIC_API_KEY;

    if (!org || !templateRepo || !token || !anthropicKey) {
      console.error(
        "Missing env vars: GITHUB_ORG, GITHUB_TEMPLATE_REPO, GITHUB_TOKEN, or ANTHROPIC_API_KEY"
      );
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const octokit = new Octokit({ auth: token });
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Create repo from template
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

    // Wait for GitHub to finish copying files
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Personalize files — replace placeholders with real data
    const filesToPersonalize = [
      "README.md",
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

        const updated = content
          .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
          .replace(/\{\{RESPONSIBLE_EMAIL\}\}/g, email)
          .replace(
            /\{\{DEPLOY_DATE\}\}/g,
            new Date().toISOString().split("T")[0]
          );

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
        console.warn(`Skipping ${filePath}:`, e);
      }
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

    await updateStatus(octokit, org, slug, completedPaths, allPaths, true);

    const repoUrl = `https://github.com/${org}/${slug}`;

    return new Response(
      JSON.stringify({ success: true, slug, repoUrl }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Deploy error:", error);

    if (error.status === 422) {
      return new Response(
        JSON.stringify({ error: "Ya existe un workspace con ese nombre" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
