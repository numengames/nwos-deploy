// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useMemo, useState } from "react";
import { TRIAL, trialOnSale } from "@/data/trial";

/** What POST /api/registro returns when a workspace is created. */
interface DeployResult {
	slug: string;
	repoUrl: string;
	accessKey?: string;
}

export default function DeployForm({ onSale = trialOnSale() }: { onSale?: boolean }) {
	const [companyName, setCompanyName] = useState("");
	const [email, setEmail] = useState("");
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [status, setStatus] = useState<"idle" | "paying" | "loading" | "success" | "error">("idle");
	const [result, setResult] = useState<DeployResult | null>(null);
	const [errorMsg, setErrorMsg] = useState("");
	const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
	const [now, setNow] = useState<number>(() => Date.now());

	const elapsedMs = useMemo(() => {
		if (status !== "loading" || !loadingStartedAt) return 0;
		return Math.max(0, now - loadingStartedAt);
	}, [loadingStartedAt, now, status]);

	const elapsedLabel = useMemo(() => {
		const totalSeconds = Math.floor(elapsedMs / 1000);
		const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
		const s = String(totalSeconds % 60).padStart(2, "0");
		return `${m}:${s}`;
	}, [elapsedMs]);

	const phaseLabel = useMemo(() => {
		const totalSeconds = Math.floor(elapsedMs / 1000);
		if (totalSeconds < 8) return "Creating workspace…";
		if (totalSeconds < 25) return "Preparing the repository…";
		if (totalSeconds < 60) return "Researching your organisation…";
		if (totalSeconds < 110) return "Drafting the canon documents…";
		return "Finishing commits and STATUS.md…";
	}, [elapsedMs]);

	useEffect(() => {
		if (status !== "loading") return;
		const id = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(id);
	}, [status]);

	// Back from the processor: ?session_id=cs_… in the address. The server
	// reads the organisation and the email from the paid session; this tab
	// keeps nothing while the buyer is away.
	useEffect(() => {
		const sessionId = new URLSearchParams(window.location.search).get("session_id");
		if (sessionId) void deploy({ sessionId });
	}, []);

	async function deploy(payload: { companyName: string; email: string; acceptedTerms: true } | { sessionId: string }) {
		const sessionId = "sessionId" in payload ? payload.sessionId : undefined;
		setStatus(sessionId ? "loading" : "paying");
		setLoadingStartedAt(Date.now());
		setErrorMsg("");

		try {
			const res = await fetch("/api/registro", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await res.json();

			// Not paid yet: go to the processor, which brings the buyer back.
			if (res.status === 402 && data.payUrl) {
				window.location.assign(data.payUrl);
				return;
			}

			if (!res.ok) {
				setStatus("error");
				setErrorMsg(data.error || "Unknown error");
				return;
			}

			window.history.replaceState(null, "", `${window.location.pathname}#deploy`);
			setStatus("success");
			setResult(data);
		} catch {
			setStatus("error");
			setErrorMsg("Connection error. Please try again.");
		}
	}

	function handleDeploy() {
		if (!companyName || !email || !acceptedTerms || !onSale) return;
		void deploy({ companyName, email, acceptedTerms: true });
	}

	const busy = status === "loading" || status === "paying";

	// ── Success state ──
	if (status === "success" && result) {
		return (
			<div className="mx-auto max-w-md space-y-6 text-center">
				<div className="rounded-marco border border-green/30 bg-green/10 p-8">
					<p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-green">Workspace deployed</p>
					<h3 className="mt-3 font-display text-2xl text-foreground">{result.slug}</h3>
					<p className="mt-2 text-sm text-muted-foreground">Your workspace is ready on GitHub.</p>
					<a href={`/workspace/${result.slug}?key=${encodeURIComponent(result.accessKey ?? "")}`} className="mt-6 inline-flex items-center gap-2 rounded-control bg-interactivo px-6 py-2.5 text-sm font-medium text-white transition-colors duration-instante ease-ciclo hover:bg-interactivo-hover active:bg-interactivo-activo">
						Browse workspace
					</a>
					<a href={result.repoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-control border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-instante ease-ciclo hover:border-accent hover:text-accent">
						View on GitHub
					</a>
					<p className="mt-4 text-sm text-muted-foreground">The agent has finished researching and filling in the workspace. STATUS.md in the repository shows the progress and the history.</p>
					{/* AI Act art. 50 (DBT-022 #32). Provisional wording until counsel (ATH21) reviews it. */}
					<p data-ai-notice className="mt-4 rounded-marco border border-border bg-card p-3 text-left text-sm text-muted-foreground">
						<strong className="text-foreground">Written by an AI model.</strong> The documents in this workspace were drafted by an artificial intelligence model (Claude, by Anthropic) from public sources about your organisation. They are drafts: check them before relying on them or sharing them.
					</p>
					<p className="mt-3 text-xs text-dim">Keep the "Browse workspace" link: it carries your private access key and is the only way to see the workspace on the web.</p>
				</div>
			</div>
		);
	}

	// ── Form state ──
	return (
		<div className="mx-auto max-w-md space-y-5">
			{/* Company name */}
			<div className="space-y-1.5">
				<label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-dim">Organisation name</label>
				<input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" disabled={busy} className="w-full rounded-control border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-dim transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50" />
			</div>

			{/* Email */}
			<div className="space-y-1.5">
				<label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-dim">Email of the person responsible</label>
				<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ceo@acme.com" disabled={busy} className="w-full rounded-control border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-dim transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50" />
			</div>

			{/* Terms */}
			<label className="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} disabled={busy} className="mt-0.5 h-4 w-4 border-border bg-card accent-accent disabled:opacity-50" />
				<span className="text-sm text-muted-foreground leading-relaxed">
					I accept the <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-accent">
						Terms and Conditions
					</a> for deploying the NWOS workspace, and I have read the <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-accent">
						Privacy Policy
					</a>. The workspace documents are drafted by an AI model.
				</span>
			</label>

			{/* Error */}
			{status === "error" && <div className="rounded-marco border border-grana/30 bg-grana/10 p-3 text-sm text-coral">{errorMsg}</div>}

			{/* Price — OPS-015: named before paying, VAT included */}
			<div data-trial-price className="rounded-marco border border-border bg-card p-4">
				<div className="flex items-baseline justify-between gap-3">
					<span className="font-display text-3xl text-foreground">{TRIAL.priceEur} €</span>
					<span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-dim">VAT included · one payment</span>
				</div>
				<p className="mt-2 text-sm text-muted-foreground leading-relaxed">One workspace and its four founding documents, drafted by an AI model. Each one costs us the model's work, so the trial is paid. If you then hire NWOS work, the {TRIAL.priceEur} € comes off your first invoice. If the generation fails, we refund it in full.</p>
			</div>

			{/* Submit */}
			<button onClick={handleDeploy} disabled={!onSale || !companyName || !email || !acceptedTerms || busy} className="w-full rounded-control bg-interactivo px-6 py-3 text-sm font-medium text-white transition-colors duration-instante ease-ciclo hover:bg-interactivo-hover active:bg-interactivo-activo disabled:opacity-50 disabled:cursor-not-allowed">
				{status === "loading" ? (
					<span className="flex items-center justify-center gap-2">
						<span>
							{phaseLabel}
							<span className="waiting-dots" aria-hidden="true">
								···
							</span>
						</span> <span className="font-mono text-[0.75rem] tracking-[0.15em]">{elapsedLabel}</span>
					</span>
				) : status === "paying" ? (
					"Taking you to the payment page…"
				) : onSale ? (
					`Pay ${TRIAL.priceEur} € and create my workspace`
				) : (
					"Coming soon"
				)}
			</button>

			{!onSale && <p className="text-center text-xs text-dim">Payments open shortly. Meanwhile, the example workspace below shows exactly what you get.</p>}
			{onSale && <p className="text-center text-xs text-dim">You pay on Stripe's page and come back here; the workspace is created as soon as the payment is confirmed.</p>}

			{status === "loading" && (
				<div className="rounded-marco border border-border/50 bg-card/50 p-4">
					<p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent">Researching your organisation…</p>
					<p className="mt-2 text-sm text-muted-foreground leading-relaxed">This can take 1–2 minutes. Keep this tab open.</p>
					<p className="mt-3 text-sm text-muted-foreground">
						Progress: <span className="text-foreground">{phaseLabel}</span> <span className="font-mono text-[0.75rem] tracking-[0.15em] text-dim">{elapsedLabel}</span>
					</p>
				</div>
			)}
		</div>
	);
}
