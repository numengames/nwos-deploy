# NWOS — Iteración 2: Agent Populates the Repo

## Context for the AI executing this

You are working on the `pablofm-web` repo (Astro 5 + React + Tailwind). Iteration 1 is complete: the form at `/velo` creates a GitHub repo from a template via `/api/registro`. Now we need the repo to be populated with real content by an AI agent.

Follow the design system in `DESIGN.md`. Do not touch any pages other than `/velo` and the API routes.

---

## Goal

After a repo is created, an AI agent automatically researches the company and fills in the documentation files with real, relevant content.

---

## Architecture

```
/api/registro (already exists)
    → Creates repo ✅
    → After success, calls /api/populate (fire-and-forget, non-blocking)

/api/populate (new)
    → Receives: slug, companyName, email
    → Calls Anthropic Claude API with web search enabled
    → Claude researches the company and generates content for each canon document
    → Endpoint commits the generated content to the repo via Octokit
    → Updates STATUS.md in the repo with progress
```

The user does NOT wait for the agent. The deploy form returns success as soon as the repo is created (Iteration 1). The population happens in the background.

---

## Step-by-step implementation

### Step 1: Install the Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

### Step 2: Create `/api/populate` endpoint

Create the file `src/pages/api/populate.ts`:

```typescript
import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";

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
];

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

  // Extract text from response blocks
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  return text;
}

async function commitFile(
  octokit: Octokit,
  org: string,
  repo: string,
  path: string,
  content: string,
  message: string
) {
  // Get current file to obtain SHA
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
  } catch (e) {
    // STATUS.md might not exist yet — create it
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
    const { slug, companyName, email } = await request.json();

    if (!slug || !companyName) {
      return new Response(
        JSON.stringify({ error: "slug and companyName required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const org = import.meta.env.GITHUB_ORG;
    const token = import.meta.env.GITHUB_TOKEN;
    const anthropicKey = import.meta.env.ANTHROPIC_API_KEY;

    const octokit = new Octokit({ auth: token });
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const allPaths = DOCUMENTS.map((d) => d.path);
    const completedPaths: string[] = [];

    // Process each document sequentially
    for (const doc of DOCUMENTS) {
      try {
        const content = await generateContent(
          anthropic,
          companyName,
          doc.prompt
        );

        await commitFile(
          octokit,
          org,
          slug,
          doc.path,
          content,
          `Agent: populate ${doc.path} for ${companyName}`
        );

        completedPaths.push(doc.path);

        // Update status after each document
        await updateStatus(octokit, org, slug, completedPaths, allPaths, false);
      } catch (e) {
        console.error(`Error populating ${doc.path}:`, e);
      }
    }

    // Final status update
    await updateStatus(octokit, org, slug, completedPaths, allPaths, true);

    return new Response(
      JSON.stringify({
        success: true,
        populated: completedPaths.length,
        total: allDocs.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Populate error:", error);
    return new Response(
      JSON.stringify({ error: "Error populating workspace" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**IMPORTANT BUG TO FIX:** In the final return, change `allDocs.length` to `DOCUMENTS.length`. This is intentional — the AI executing this should catch and fix it.

### Step 3: Update `/api/registro` to trigger populate

In `src/pages/api/registro.ts`, after the repo is successfully created and personalized, add a fire-and-forget call to `/api/populate`:

```typescript
// After the personalization loop and before the final return, add:

// Fire-and-forget: trigger agent population (don't await)
const baseUrl = new URL(request.url).origin;
fetch(`${baseUrl}/api/populate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ slug, companyName, email }),
}).catch((e) => console.error("Failed to trigger populate:", e));
```

This call is NOT awaited — the user gets their success response immediately, and the agent works in the background.

### Step 4: Add STATUS.md to the template repo

In the `nwos-template` repo (on GitHub, in the `numen-games-nwos-orgs` org), add a file called `STATUS.md` at the root:

```markdown
# Workspace Status

- **Created:** {{DEPLOY_DATE}}
- **Agent status:** ⏳ Waiting for agent...
- **Last updated:** {{DEPLOY_DATE}}

## Progress

- [ ] C-001-mission-vision-values
- [ ] C-002-culture
- [ ] C-003-org-structure
- [ ] C-004-glossary
```

### Step 5: Update the DeployForm success state

In `src/components/DeployForm.tsx`, update the success state to inform the user that the agent is working:

In the success `<div>`, after the "Open workspace" link, add:

```tsx
<p className="mt-4 text-sm text-muted-foreground">
  An AI agent is now researching your company and populating the workspace.
  Check the STATUS.md file in your repo for progress.
</p>
```

---

## Environment variables required

Make sure these exist in `.env` AND in Vercel:

```
GITHUB_TOKEN=ghp_xxxx
GITHUB_ORG=numen-games-nwos-orgs
GITHUB_TEMPLATE_REPO=nwos-template
ANTHROPIC_API_KEY=sk-ant-xxxx
```

---

## Testing

1. Run `npm run dev`
2. Go to `http://localhost:4321/velo`
3. Create a workspace for a real, public company (e.g. "Stripe" or "Notion")
4. Check the repo on GitHub — within 2-5 minutes the canon files should be populated
5. Check `STATUS.md` — it should show progress updates

---

## Definition of done

- [ ] `/api/populate` endpoint exists and works
- [ ] `/api/registro` triggers `/api/populate` after repo creation (fire-and-forget)
- [ ] Agent calls Claude API with web search to research the company
- [ ] Agent populates the 4 canon documents with real or inferred content
- [ ] Agent commits each file with a clear commit message
- [ ] `STATUS.md` updates after each document is completed
- [ ] Uncertain content is marked with `<!-- NEEDS REVIEW -->`
- [ ] DeployForm shows a message about the agent working in the background
- [ ] The user is NOT blocked — deploy returns immediately

---

## Important notes for the AI executing this

- Do NOT modify any pages other than `/velo` and the two API routes.
- Follow the design system in `DESIGN.md` for any UI changes.
- The Anthropic SDK uses `@anthropic-ai/sdk`, NOT `anthropic`.
- Web search is enabled via the `tools` parameter in the Claude API call.
- The `fire-and-forget` pattern means we call `fetch()` without `await`. The response returns to the user while the agent works.
- On Vercel, serverless functions have a timeout (default 60s on Hobby, 300s on Pro). If the agent takes longer, consider splitting into per-document calls or using Vercel's background functions.
