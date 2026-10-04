// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// "Take it home" — the card under a workspace that makes "yours" true.
// Decided by the Oracle on 2026-10-04: download for anyone with the link,
// git for the client's technical people. Three ways, lightest first.
import { useState } from "react";

type Phase = "idle" | "busy" | "done" | "error";

export default function TakeHome({ slug, accessKey, demo }: { slug: string; accessKey: string; demo: boolean }) {
	const keyParam = `key=${encodeURIComponent(accessKey)}`;
	const [copied, setCopied] = useState(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2500);
		} catch {
			/* clipboard blocked: the address bar still holds the link */
		}
	}

	return (
		<section data-take-home className="mt-8 rounded-marco border border-accent/30 bg-accent/5 p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent">Take it home</p>
				<button type="button" onClick={copyLink} className="inline-flex min-h-[36px] items-center rounded-control border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent">
					{copied ? "Link copied" : "Copy this link for your team"}
				</button>
			</div>
			<p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground">{demo ? "A real workspace is yours from the first minute. These are the three ways to hold it, lightest first — on the example only the download works." : "This workspace is yours. Three ways to hold it, lightest first. Anyone with this page's link can read it and take it home, so share the link only with your team."}</p>

			<div className="mt-5 grid gap-4 md:grid-cols-3">
				{/* 1 · Download */}
				<div className="flex flex-col rounded-marco border border-border bg-card p-5">
					<p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-dim">1 · Download</p>
					<p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">Every file, as plain text, in one .zip. No account needed.</p>
					<a href={`/api/workspace/${slug}/download?${keyParam}`} download={`${slug}.zip`} className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-control bg-interactivo px-4 text-sm font-medium text-white transition-colors hover:bg-interactivo-hover">
						Download .zip
					</a>
				</div>

				{/* 2 · Clone with git */}
				<GitHubAction n="2" title="Clone with git" text="We invite your GitHub user to the repository: you get the whole history and can push." button="Invite me" endpoint={`/api/workspace/${slug}/invite?${keyParam}`} demo={demo} done={(r) => (r.already ? `${r.invited} already has access. Clone it: git clone ${r.clone}` : `Invitation sent to ${r.invited}. Accept it on GitHub, then: git clone ${r.clone}`)} />

				{/* 3 · Transfer */}
				<GitHubAction n="3" title="Transfer the repository" text="It moves to your GitHub account with its history. We keep no copy, and this page stops working. From your account, move it into your organisation in one click." button="Transfer" endpoint={`/api/workspace/${slug}/transfer?${keyParam}`} demo={demo} done={(r) => `GitHub has emailed ${r.to}. Accept the transfer within a day; the repository is then yours, and this page will stop working.`} />
			</div>
		</section>
	);
}

function GitHubAction({ n, title, text, button, endpoint, demo, done }: { n: string; title: string; text: string; button: string; endpoint: string; demo: boolean; done: (r: Record<string, string | boolean>) => string }) {
	const [username, setUsername] = useState("");
	const [phase, setPhase] = useState<Phase>("idle");
	const [message, setMessage] = useState("");
	const id = `take-home-${n}`;

	async function run() {
		setPhase("busy");
		setMessage("");
		try {
			const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
			const data = (await res.json()) as Record<string, string | boolean>;
			if (!res.ok) {
				setPhase("error");
				setMessage(String(data.error ?? "Something went wrong. Nothing changed."));
				return;
			}
			setPhase("done");
			setMessage(done(data));
		} catch {
			setPhase("error");
			setMessage("Connection error. Nothing changed; try again.");
		}
	}

	return (
		<div className="flex flex-col rounded-marco border border-border bg-card p-5">
			<p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-dim">
				{n} · {title}
			</p>
			<p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
			{demo ? (
				<p className="mt-4 text-xs text-dim">On your own workspace. The example stays here for everyone.</p>
			) : phase === "done" ? (
				<p role="status" className="mt-4 rounded-control border border-green/30 bg-green/10 p-3 text-sm text-foreground">
					{message}
				</p>
			) : (
				<form
					className="mt-4 space-y-2"
					onSubmit={(e) => {
						e.preventDefault();
						if (username && phase !== "busy") void run();
					}}
				>
					<label htmlFor={id} className="block font-mono text-[0.65rem] uppercase tracking-[0.15em] text-dim">
						Your GitHub username
					</label>
					<input id={id} name="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="octocat" disabled={phase === "busy"} className="w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-dim focus:border-accent disabled:opacity-50" />
					{phase === "error" && (
						<p role="alert" className="rounded-control border border-grana/30 bg-grana/10 p-2 text-xs text-coral">
							{message}
						</p>
					)}
					<button type="submit" disabled={!username || phase === "busy"} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-control border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50">
						{phase === "busy" ? (
							<span>
								Asking GitHub
								<span className="waiting-dots" aria-hidden="true">
									···
								</span>
							</span>
						) : (
							button
						)}
					</button>
				</form>
			)}
		</div>
	);
}
