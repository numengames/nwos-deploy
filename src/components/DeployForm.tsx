import { useEffect, useMemo, useState } from "react";

export default function DeployForm() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
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
    if (totalSeconds < 8) return "Creando workspace…";
    if (totalSeconds < 25) return "Preparando el repositorio…";
    if (totalSeconds < 60) return "Investigando tu empresa…";
    if (totalSeconds < 110) return "Generando documentos canon…";
    return "Finalizando commits y STATUS.md…";
  }, [elapsedMs]);

  useEffect(() => {
    if (status !== "loading") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [status]);

  async function handleDeploy() {
    if (!companyName || !email || !acceptedTerms) return;

    setStatus("loading");
    setLoadingStartedAt(Date.now());
    setErrorMsg("");

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, acceptedTerms }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Error desconocido");
        return;
      }

      setStatus("success");
      setResult(data);
    } catch (e) {
      setStatus("error");
      setErrorMsg("Error de conexión. Inténtalo de nuevo.");
    }
  }

  // ── Success state ──
  if (status === "success" && result) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-8">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-green-400">
            Workspace deployed
          </p>
          <h3 className="mt-3 font-display text-2xl text-foreground">
            {result.slug}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu workspace está listo en GitHub.
          </p>
          <a
            href={`/workspace/${result.slug}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90"
          >
            Browse workspace →
          </a>
          <a
            href={result.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            View on GitHub →
          </a>
          <p className="mt-4 text-sm text-muted-foreground">
            El agente ya terminó de investigar y poblar el workspace. Puedes revisar el archivo
            STATUS.md en el repo para ver el progreso y el historial.
          </p>
        </div>
      </div>
    );
  }

  // ── Form state ──
  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* Company name */}
      <div className="space-y-1.5">
        <label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-dim">
          Nombre de la organización
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Corp"
          disabled={status === "loading"}
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-dim transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-dim">
          Email del responsable
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ceo@acme.com"
          disabled={status === "loading"}
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-dim transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          disabled={status === "loading"}
          className="mt-0.5 h-4 w-4 rounded border-border bg-card accent-accent disabled:opacity-50"
        />
        <span className="text-sm text-muted-foreground leading-relaxed">
          Acepto los términos y condiciones del despliegue del workspace NWOS.
        </span>
      </label>

      {/* Error */}
      {status === "error" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleDeploy}
        disabled={!companyName || !email || !acceptedTerms || status === "loading"}
        className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
            {phaseLabel} <span className="font-mono text-[0.75rem] tracking-[0.15em]">{elapsedLabel}</span>
          </span>
        ) : (
          "Deploy Workspace"
        )}
      </button>

      {status === "loading" && (
        <div className="rounded-lg border border-border/50 bg-card/50 p-4">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent">
            Investigando tu empresa…
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Esto puede tardar 1–2 minutos. Mantén esta pestaña abierta.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Progreso: <span className="text-foreground">{phaseLabel}</span>{" "}
            <span className="font-mono text-[0.75rem] tracking-[0.15em] text-dim">{elapsedLabel}</span>
          </p>
        </div>
      )}
    </div>
  );
}
