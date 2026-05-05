"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UniDeploySocket, WSMessage, Finding as WSFinding, ScanSummary } from "@/lib/websocket";
import {
  Finding, RemediationPlan, ScanStatus,
  startScan, getScanStatus, getScanPlan, triggerFix,
} from "@/lib/api";
import SecurityGrade from "@/components/SecurityGrade";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: "#0F1410",
  surface: "#161D16",
  surfaceHover: "#1C2A1C",
  border: "#2A3A2A",
  text: "#E8F0D8",
  muted: "#6A7A5A",
  green: "#6DB84A",
  red: "#FF6B6B",
  amber: "#F0A830",
  blue: "#6AB4F0",
  font: "var(--font-body), DM Sans, sans-serif",
  mono: "var(--font-mono), JetBrains Mono, monospace",
  display: "var(--font-display), Sora, sans-serif",
};

const severityColor = (s: string) =>
  s === "CRITICAL" ? C.red : s === "HIGH" ? C.amber : s === "MEDIUM" ? "#E0D060" : C.muted;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: C.muted,
    running: C.amber,
    planning: C.blue,
    done: C.green,
    failed: C.red,
    scanning: C.amber,
    complete: C.green,
    connected: C.blue,
    waiting: C.muted,
  };
  return (
    <span style={{
      fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
      color: colors[status] ?? C.muted, textTransform: "uppercase",
      padding: "3px 10px", border: `1px solid ${colors[status] ?? C.muted}33`,
      borderRadius: 4, background: `${colors[status] ?? C.muted}11`,
    }}>
      {status}
    </span>
  );
}

function FindingRow({ f, plan, selected, onToggle, onFix }: {
  f: Finding;
  plan?: RemediationPlan;
  selected: boolean;
  onToggle: () => void;
  onFix?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${severityColor(f.severity)}`,
      borderRadius: 8, marginBottom: 10, overflow: "hidden",
    }}>
      <div style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>
        {f.auto_fixable && (
          <input type="checkbox" checked={selected} onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 3, accentColor: C.green, cursor: "pointer" }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: severityColor(f.severity),
              fontFamily: C.mono, letterSpacing: "0.06em" }}>{f.severity}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{f.title}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: C.mono }}>
            {f.file}{f.line ? `:${f.line}` : ""}
          </div>
        </div>
        <span style={{ color: C.muted, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px 16px", borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14, color: C.text, marginTop: 12, lineHeight: 1.6 }}>{f.description}</p>
          {f.evidence && (
            <pre style={{ background: "#0A120A", padding: "10px 14px", borderRadius: 6,
              fontFamily: C.mono, fontSize: 12, color: "#C8D8B0", overflowX: "auto",
              marginTop: 10, border: `1px solid ${C.border}` }}>{f.evidence}</pre>
          )}
          {plan && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#0D1D0D",
              borderRadius: 6, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 8 }}>
                REMEDIATION PLAN · effort: {plan.effort.toUpperCase()}
              </div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{plan.summary}</p>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {plan.steps.map((s, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{s}</li>
                ))}
              </ol>
              {plan.code_example && (
                <pre style={{ background: "#0A120A", padding: "10px 14px", borderRadius: 6,
                  fontFamily: C.mono, fontSize: 12, color: "#C8D8B0", overflowX: "auto",
                  marginTop: 10, border: `1px solid ${C.border}` }}>{plan.code_example}</pre>
              )}
              {plan.references.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {plan.references.map((ref, i) => (
                    <a key={i} href={ref} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: C.blue, fontFamily: C.mono }}>
                      {ref.replace(/^https?:\/\//, "").split("/")[0]}
                    </a>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: C.red, marginTop: 10, fontStyle: "italic" }}>
                Risk if ignored: {plan.risk_if_ignored}
              </p>
            </div>
          )}
          {f.auto_fixable && onFix && (
            <button onClick={onFix} style={{
              marginTop: 12, background: C.green, color: C.bg, border: "none",
              padding: "7px 16px", borderRadius: 6, cursor: "pointer",
              fontWeight: 700, fontSize: 13, fontFamily: C.font,
            }}>
              Apply This Fix
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── GitHub Scan Mode ──────────────────────────────────────────────────────────

function GithubScanFlow({ initialScanId }: { initialScanId?: string }) {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [scanId, setScanId] = useState(initialScanId ?? "");
  const [scan, setScan] = useState<ScanStatus | null>(null);
  const [plans, setPlans] = useState<RemediationPlan[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fixing, setFixing] = useState(false);
  const [prResult, setPrResult] = useState<{ pr_url: string | null; error: string | null } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll scan status
  useEffect(() => {
    if (!scanId) return;
    const poll = async () => {
      try {
        const s = await getScanStatus(scanId);
        setScan(s);
        if (s.status === "done" || s.status === "failed") {
          clearInterval(pollRef.current!);
          if (s.status === "done") {
            const planData = await getScanPlan(scanId).catch(() => null);
            if (planData) setPlans(planData.remediation_plans ?? []);
            const autoFixable = s.findings.filter(f => f.auto_fixable).map(f => f.id);
            setSelectedIds(new Set(autoFixable));
          }
        }
      } catch {
        clearInterval(pollRef.current!);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current!);
  }, [scanId]);

  const handleStartScan = async () => {
    if (!githubUrl.trim()) return;
    const result = await startScan(githubUrl.trim(), branch);
    setScanId(result.scan_id);
    router.replace(`/dashboard?scan_id=${result.scan_id}`);
  };

  const handleFix = async () => {
    if (!scanId || fixing) return;
    setFixing(true);
    try {
      const result = await triggerFix(scanId, Array.from(selectedIds));
      setPrResult({ pr_url: result.pr_url, error: result.error });
    } catch (e: unknown) {
      setPrResult({ pr_url: null, error: e instanceof Error ? e.message : "Fix failed" });
    } finally {
      setFixing(false);
    }
  };

  const planByFindingId = Object.fromEntries(plans.map(p => [p.finding_id, p]));
  const fixableFindings = scan?.findings.filter(f => f.auto_fixable) ?? [];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: C.font }}>
      {/* Header */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
        <a href="/" style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700,
          color: C.text, textDecoration: "none" }}>unideploy</a>
        <a href="/connect" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
          CLI session →
        </a>
      </nav>

      <h1 style={{ fontFamily: C.display, fontSize: "clamp(28px,5vw,38px)", fontWeight: 800,
        color: C.text, letterSpacing: "-0.03em", marginBottom: 8 }}>
        Security Scanner
      </h1>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>
        Paste a GitHub repository URL — we'll clone it inside an isolated sandbox and scan for production issues.
      </p>

      {/* Scan input form */}
      {!scanId && (
        <div style={{ display: "flex", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
          <input
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleStartScan()}
            placeholder="https://github.com/you/your-repo"
            style={{
              flex: 1, minWidth: 280, padding: "10px 14px",
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontFamily: C.mono, fontSize: 14,
              outline: "none",
            }}
          />
          <input
            value={branch}
            onChange={e => setBranch(e.target.value)}
            placeholder="branch"
            style={{
              width: 100, padding: "10px 12px",
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontFamily: C.mono, fontSize: 14,
              outline: "none",
            }}
          />
          <button onClick={handleStartScan} disabled={!githubUrl.trim()} style={{
            padding: "10px 24px", background: C.green, color: C.bg, border: "none",
            borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
            fontFamily: C.font, opacity: githubUrl.trim() ? 1 : 0.4,
          }}>
            Scan Repo
          </button>
        </div>
      )}

      {/* Scan status bar */}
      {scan && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32,
          padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10 }}>
          <StatusBadge status={scan.status} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.text, fontFamily: C.mono }}>
              {scan.github_url.replace("https://github.com/", "")} @ {scan.branch}
            </div>
            {scan.framework && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                framework: {scan.framework}
              </div>
            )}
          </div>
          {scan.security_grade && <SecurityGrade grade={scan.security_grade} size="md" />}
        </div>
      )}

      {/* Loading state */}
      {scan && ["queued", "running", "planning"].includes(scan.status) && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 24, marginBottom: 16, animation: "spin 1.5s linear infinite",
            display: "inline-block" }}>⟳</div>
          <div style={{ fontSize: 14 }}>
            {scan.status === "queued" && "Waiting in queue..."}
            {scan.status === "running" && "Cloning repo and running security checks inside sandbox..."}
            {scan.status === "planning" && "Generating remediation plan..."}
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error state */}
      {scan?.status === "failed" && (
        <div style={{ padding: "20px", background: `${C.red}11`, border: `1px solid ${C.red}33`,
          borderRadius: 8, color: C.red, fontSize: 14 }}>
          Scan failed: {scan.error ?? "Unknown error"}
        </div>
      )}

      {/* Results */}
      {scan?.status === "done" && (
        <>
          {/* Summary bar */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "CRITICAL", count: scan.findings.filter(f => f.severity === "CRITICAL").length, color: C.red },
              { label: "HIGH", count: scan.findings.filter(f => f.severity === "HIGH").length, color: C.amber },
              { label: "MEDIUM", count: scan.findings.filter(f => f.severity === "MEDIUM").length, color: "#E0D060" },
              { label: "LOW", count: scan.findings.filter(f => f.severity === "LOW").length, color: C.muted },
              { label: "AUTO-FIXABLE", count: fixableFindings.length, color: C.green },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ fontSize: 12, color, fontFamily: C.mono, fontWeight: 700 }}>
                {count} {label}
              </div>
            ))}
          </div>

          {/* PR result */}
          {prResult && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderRadius: 8,
              background: prResult.pr_url ? `${C.green}11` : `${C.red}11`,
              border: `1px solid ${prResult.pr_url ? C.green : C.red}33` }}>
              {prResult.pr_url ? (
                <div>
                  <div style={{ color: C.green, fontWeight: 700, marginBottom: 8 }}>
                    ✓ Pull Request opened
                  </div>
                  <a href={prResult.pr_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.blue, fontFamily: C.mono, fontSize: 13 }}>
                    {prResult.pr_url}
                  </a>
                </div>
              ) : (
                <div style={{ color: C.red }}>Fix error: {prResult.error}</div>
              )}
            </div>
          )}

          {/* Apply Fixes bar */}
          {fixableFindings.length > 0 && !prResult && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 13, color: C.text }}>
                <span style={{ color: C.green, fontWeight: 700 }}>{selectedIds.size}</span> of{" "}
                {fixableFindings.length} auto-fixable findings selected
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSelectedIds(new Set(fixableFindings.map(f => f.id)))}
                  style={{ padding: "7px 14px", background: "transparent", color: C.muted,
                    border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer",
                    fontSize: 12, fontFamily: C.font }}>
                  Select all
                </button>
                <button onClick={handleFix} disabled={selectedIds.size === 0 || fixing}
                  style={{ padding: "7px 18px", background: C.green, color: C.bg, border: "none",
                    borderRadius: 6, cursor: selectedIds.size === 0 || fixing ? "not-allowed" : "pointer",
                    fontWeight: 700, fontSize: 13, fontFamily: C.font,
                    opacity: selectedIds.size === 0 || fixing ? 0.5 : 1 }}>
                  {fixing ? "Creating PR..." : `Apply Fixes → GitHub PR`}
                </button>
              </div>
            </div>
          )}

          {/* Findings list */}
          {scan.findings.map(f => (
            <FindingRow
              key={f.id}
              f={f}
              plan={planByFindingId[f.id]}
              selected={selectedIds.has(f.id)}
              onToggle={() => {
                const next = new Set(selectedIds);
                if (next.has(f.id)) next.delete(f.id);
                else next.add(f.id);
                setSelectedIds(next);
              }}
              onFix={f.auto_fixable ? () => {
                setSelectedIds(new Set([f.id]));
                handleFix();
              } : undefined}
            />
          ))}

          {scan.findings.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>No issues found</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Your repo passes all {13} security checks.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── CLI Session Mode (existing WebSocket flow) ────────────────────────────────

function CliSessionFlow({ sessionId, machineProp }: { sessionId: string; machineProp: string | null }) {
  const [machine, setMachine] = useState(machineProp);
  const [status, setStatus] = useState<"waiting" | "connected" | "scanning" | "complete">("waiting");
  const [findings, setFindings] = useState<WSFinding[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [socket, setSocket] = useState<UniDeploySocket | null>(null);

  useEffect(() => {
    const ws = new UniDeploySocket(
      sessionId,
      (msg: WSMessage) => {
        if (msg.type === "browser_connected") setStatus("connected");
        else if (msg.type === "cli_ready") {
          setStatus("scanning");
          if (msg.machine_name) setMachine(msg.machine_name);
        } else if (msg.type === "finding") {
          setFindings(prev => [...prev, msg.finding]);
        } else if (msg.type === "scan_complete") {
          setStatus("complete");
          setSummary(msg.summary);
        }
      }
    );
    ws.connect();
    setSocket(ws);
    return () => ws.disconnect();
  }, [sessionId]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: C.font }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
        <a href="/" style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700,
          color: C.text, textDecoration: "none" }}>unideploy</a>
        <a href="/dashboard" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
          Scan GitHub repo →
        </a>
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40,
        padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <StatusBadge status={status} />
        <div style={{ fontSize: 14, color: C.text }}>{machine ?? "Connecting..."}</div>
        {summary && <SecurityGrade grade={summary.grade} size="md" />}
      </div>

      {status === "waiting" && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>
          Waiting for CLI to connect...
          <div style={{ fontFamily: C.mono, fontSize: 12, marginTop: 12, color: C.border }}>
            Run <span style={{ color: C.green }}>npx unideploy init</span> and enter the code at{" "}
            <span style={{ color: C.green }}>unideploy.in/connect</span>
          </div>
        </div>
      )}

      {findings.map((f, i) => (
        <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${severityColor(f.severity)}`, borderRadius: 8,
          padding: "12px 16px", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: severityColor(f.severity),
              fontFamily: C.mono }}>{f.severity}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{f.title}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: C.mono, marginBottom: 6 }}>
            {f.file}:{f.line}
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{f.description}</div>
          {f.auto_fixable && (
            <button onClick={() => socket?.sendApplyFix(f.id)} style={{
              marginTop: 10, background: C.green, color: C.bg, border: "none",
              padding: "6px 14px", borderRadius: 5, cursor: "pointer",
              fontWeight: 700, fontSize: 12, fontFamily: C.font,
            }}>
              Apply Fix
            </button>
          )}
        </div>
      ))}

      {summary && (
        <div style={{ padding: "20px 24px", background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 16 }}>
          <div style={{ fontFamily: C.display, fontSize: 18, fontWeight: 700,
            color: C.text, marginBottom: 12 }}>Scan complete</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              ["Total", summary.total],
              ["Critical", summary.critical],
              ["High", summary.high],
              ["Auto-fixable", summary.auto_fixable],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase",
                  fontFamily: C.mono, letterSpacing: "0.06em" }}>{l}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function DashboardContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const scanId = params.get("scan_id");
  const machine = params.get("machine");

  // CLI session flow
  if (sessionId) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
        <CliSessionFlow sessionId={sessionId} machineProp={machine} />
      </div>
    );
  }

  // GitHub URL scan flow (new scan or polling existing scan_id)
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <GithubScanFlow initialScanId={scanId ?? undefined} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0F1410", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#6A7A5A",
        fontFamily: "DM Sans, sans-serif" }}>
        Loading...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
