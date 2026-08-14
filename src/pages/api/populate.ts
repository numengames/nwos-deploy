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
] as const;

async function generateContent(
	client: Anthropic,
	companyName: string,
	promptTemplate: string,
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
	message: string,
) {
	const { data: fileData } = await octokit.request(
		"GET /repos/{owner}/{repo}/contents/{path}",
		{ owner: org, repo, path },
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
	isFinished: boolean,
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
				: `Agent: progress update (${completedDocs.length}/${allDocs.length})`,
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
		const { slug, companyName, email } = await request.json();

		if (!slug || !companyName) {
			return new Response(
				JSON.stringify({ error: "slug and companyName required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const org = import.meta.env.GITHUB_ORG;
		const token = import.meta.env.GITHUB_TOKEN;
		const anthropicKey = import.meta.env.ANTHROPIC_API_KEY;

		if (!org || !token || !anthropicKey) {
			console.error("Missing env vars: GITHUB_ORG, GITHUB_TOKEN, or ANTHROPIC_API_KEY");
			return new Response(
				JSON.stringify({ error: "Server configuration incomplete" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const octokit = new Octokit({ auth: token });
		const anthropic = new Anthropic({ apiKey: anthropicKey });

		const allPaths = DOCUMENTS.map((d) => d.path);
		const completedPaths: string[] = [];

		// Process each document sequentially (keeps updates ordered + easier to reason about)
		for (const doc of DOCUMENTS) {
			try {
				const content = await generateContent(anthropic, companyName, doc.prompt);

				await commitFile(
					octokit,
					org,
					slug,
					doc.path,
					content,
					`Agent: populate ${doc.path} for ${companyName}`,
				);

				completedPaths.push(doc.path);
				await updateStatus(octokit, org, slug, completedPaths, allPaths, false);
			} catch (e) {
				console.error(`Error populating ${doc.path}:`, e);
			}
		}

		await updateStatus(octokit, org, slug, completedPaths, allPaths, true);

		return new Response(
			JSON.stringify({
				success: true,
				populated: completedPaths.length,
				total: DOCUMENTS.length,
				email: email ?? null,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error: any) {
		console.error("Populate error:", error);
		return new Response(
			JSON.stringify({ error: "Error populating workspace" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

