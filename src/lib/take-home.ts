// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Taking a workspace home — the three ways, decided 2026-10-04 by the
// Oracle after the panel: the workspace must be downloadable by anyone
// with the link, and reachable with git for the client's technical people.
//
//   · download  — a .zip of every file, no account needed
//   · invite    — the client's GitHub user is invited to the repository,
//                 so it can be cloned with its history and pushed to
//   · transfer  — the repository moves to the client's GitHub account;
//                 the house keeps no copy and the viewer stops working
//
// Anyone holding the workspace link holds the key, so anyone with it can
// take the workspace home: the page says so. Tying these actions to the
// buyer's email is a later step (there is no email sending yet).

import type { Octokit } from "octokit";
import { errorStatus } from "@/lib/log";

/** GitHub's rule: alphanumerics and single hyphens, at most 39 characters. */
export const GITHUB_USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function readUsername(body: unknown): string | null {
	const raw = typeof (body as { username?: unknown })?.username === "string" ? (body as { username: string }).username.trim().replace(/^@/, "") : "";
	return GITHUB_USERNAME_RE.test(raw) ? raw : null;
}

export type TakeHomeResult = { ok: true; status: number; body: Record<string, unknown> } | { ok: false; status: number; error: string };

export const DEMO_CANNOT_BE_TAKEN = "The example belongs to everyone, so it stays here. Try the trial with your organisation and the workspace you get can be taken home.";

/** Invite a GitHub user to the repository with write access. */
export async function inviteCollaborator(octokit: Octokit, org: string, slug: string, username: string): Promise<TakeHomeResult> {
	try {
		const { status } = await octokit.request("PUT /repos/{owner}/{repo}/collaborators/{username}", { owner: org, repo: slug, username, permission: "push" });
		// 201 = invitation created; 204 = already a collaborator (GitHub's
		// types list only 201, hence the cast).
		const already = (status as number) === 204;
		return { ok: true, status: 200, body: { invited: username, already, clone: `https://github.com/${org}/${slug}.git` } };
	} catch (e) {
		if (errorStatus(e) === 404) return { ok: false, status: 400, error: `GitHub does not know a user called ${username}. Check the spelling.` };
		return { ok: false, status: 502, error: "GitHub did not accept the invitation. Nothing changed; try again in a minute or write to hola@numengames.com." };
	}
}

/** Move the repository to a GitHub user's account. The user accepts by email. */
export async function transferRepository(octokit: Octokit, org: string, slug: string, username: string): Promise<TakeHomeResult> {
	try {
		await octokit.request("POST /repos/{owner}/{repo}/transfer", { owner: org, repo: slug, new_owner: username });
		return { ok: true, status: 200, body: { to: username, state: "pending" } };
	} catch (e) {
		const status = errorStatus(e);
		if (status === 404) return { ok: false, status: 400, error: `GitHub does not know a user called ${username}. Check the spelling.` };
		if (status === 422) return { ok: false, status: 409, error: `GitHub refused the transfer: ${username} may already have a repository called ${slug}, or cannot receive one. Nothing changed. Rename it there, or write to hola@numengames.com.` };
		return { ok: false, status: 502, error: "GitHub did not accept the transfer. Nothing changed; try again in a minute or write to hola@numengames.com." };
	}
}
