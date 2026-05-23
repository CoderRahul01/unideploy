"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UniDeploySocket, WSMessage } from "@/lib/websocket";
import {
  Finding, RemediationPlan, ScanStatus, ScanReport, ReportFinding,
  startScan, getScanStatus, getScanPlan, triggerFix, getScanReport, getCurrentUser, AuthResponse
} from "@/lib/api";
import SecurityGrade from "@/components/SecurityGrade";
import posthog from "posthog-js";

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

const severityColor = (s: string) => {
  const n = s.toLowerCase();
  if (n === "critical") return C.red;
  if (n === "high") return C.amber;
  if (n === "medium") return "#E0D060";
  return C.muted;
};

const CATEGORY_LABELS: Record<string, string> = {
  secrets: "Secrets",
  auth: "Auth",
  rls: "RLS",
  cors: "CORS",
  rate_limiting: "Rate Limiting",
  input_validation: "Input Validation",
  dependency: "Dependency",
  error_handling: "Error Handling",
  other: "Other",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: C.muted, running: C.amber, planning: C.blue,
    done: C.green, failed: C.red, scanning: C.amber,
    complete: C.green, connected: C.blue, waiting: C.muted,
  };
  const col = colors[status] ?? C.muted;
  return (
    <span style={{
      fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
      color: col, textTransform: "uppercase", padding: "3px 10px",
      border: `1px solid ${col}33`, borderRadius: 4, background: `${col}11`,
    }}>
      {status}
    </span>
  );
}

function SeverityBar({ findings }: { findings: Array<{ severity: string }> }) {
  const counts = {
    critical: findings.filter(f => f.severity.toLowerCase() === "critical").length,
    high: findings.filter(f => f.severity.toLowerCase() === "high").length,
    medium: findings.filter(f => f.severity.toLowerCase() === "medium").length,
    low: findings.filter(f => f.severity.toLowerCase() === "low").length,
  };
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {(["critical", "high", "medium", "low"] as const).map(sev => (
        <div key={sev} style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 28, fontWeight: 800, color: severityColor(sev),
            fontFamily: C.display,
          }}>{counts[sev]}</div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {sev}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportFindingCard({
  f,
  onFix,
}: {
  f: ReportFinding;
  onFix?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${severityColor(f.severity)}`,
      borderRadius: 8, marginBottom: 10, overflow: "hidden",
    }}>
      <div
        style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: severityColor(f.severity),
              fontFamily: C.mono, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>{f.severity}</span>
            <span style={{
              fontSize: 10, fontFamily: C.mono, color: C.muted,
              background: `${C.muted}18`, padding: "1px 6px", borderRadius: 3,
            }}>{CATEGORY_LABELS[f.category] ?? f.category}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{f.title}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: C.mono }}>
            {f.file_path}{f.line_number ? `:${f.line_number}` : ""}
          </div>
        </div>
        {f.auto_fixable && (
          <span style={{ fontSize: 10, color: C.green, fontFamily: C.mono,
            border: `1px solid ${C.green}44`, padding: "2px 7px", borderRadius: 3 }}>
            auto-fixable
          </span>
        )}
        <span style={{ color: C.muted, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14, color: C.text, marginTop: 12, lineHeight: 1.6 }}>
            {f.description}
          </p>
          {f.evidence && (
            <pre style={{
              background: "#0A120A", padding: "10px 14px", borderRadius: 6,
              fontFamily: C.mono, fontSize: 12, color: "#C8D8B0", overflowX: "auto",
              marginTop: 10, border: `1px solid ${C.border}`,
            }}>{f.evidence}</pre>
          )}
          {f.fix_guideline && (
            <div style={{
              marginTop: 12, padding: "12px 14px", background: "#0D1D0D",
              borderRadius: 6, border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 6, fontFamily: C.mono }}>
                FIX GUIDELINE
              </div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: 0 }}>
                {f.fix_guideline}
              </p>
            </div>
          )}
          {f.auto_fixable && onFix && (
            <button
              onClick={onFix}
              style={{
                marginTop: 12, background: C.green, color: C.bg, border: "none",
                padding: "7px 16px", borderRadius: 6, cursor: "pointer",
                fontWeight: 700, fontSize: 13, fontFamily: C.font,
              }}
            >
              Fix with AI
            </button>
          )}
        </div>
      )}
    </div>
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
      <div
        style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
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

// ── CLI Session / Report View ─────────────────────────────────────────────────

function CliReportView({ sessionId }: { sessionId: string }) {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [scanStatus, setScanStatus] = useState<"waiting" | "scanning" | "complete">("waiting");
  const [filesScanned, setFilesScanned] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [fixPhase, setFixPhase] = useState<"idle" | "patching" | "done">("idle");
  const [fixedIds, setFixedIds] = useState<string[]>([]);
  const [fixToast, setFixToast] = useState<string | null>(null);
  const [wsActive, setWsActive] = useState(false);
  const socketRef = useRef<UniDeploySocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load report immediately (session might already be complete)
  useEffect(() => {
    getScanReport(sessionId)
      .then(r => {
        setReport(r);
        setScanStatus("complete");
        posthog.capture("scan_report_viewed", {
          grade: r.grade,
          total_issues: r.total_issues,
          auto_fixable: r.auto_fixable,
          framework: r.framework,
          files_scanned: r.files_scanned,
        });
      })
      .catch(() => setScanStatus("waiting"));
  }, [sessionId]);

  // Connect browser WebSocket to receive live progress + scan_complete + fix events
  useEffect(() => {
    const ws = new UniDeploySocket(
      sessionId,
      (msg: WSMessage) => {
        if (msg.type === "scan_progress") {
          setScanStatus("scanning");
          setFilesScanned(msg.files_scanned ?? 0);
          setTotalFiles(msg.total_files ?? 0);
        } else if (msg.type === "scan_complete") {
          setScanStatus("complete");
          // Poll until report is available
          pollRef.current = setInterval(async () => {
            try {
              const r = await getScanReport(sessionId);
              setReport(r);
              clearInterval(pollRef.current!);
            } catch { /* keep polling */ }
          }, 1500);
        } else if (msg.type === "fix_started") {
          setFixPhase("patching");
        } else if (msg.type === "rescan_done") {
          setReport(prev => prev ? {
            ...prev,
            grade: msg.grade as ScanReport["grade"],
            total_issues: msg.total_issues,
            auto_fixable: msg.auto_fixable,
            findings: msg.findings as ReportFinding[],
          } : null);
          setFixedIds(prev => [...prev, ...msg.fixed_ids]);
          setFixPhase("done");
          const count = msg.fixed_ids.length;
          const toastText = `${count} issue${count !== 1 ? "s" : ""} fixed — grade updated to ${msg.grade}`;
          setFixToast(toastText);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setFixToast(null), 6000);
        }
      },
      () => setWsActive(true),
      () => setWsActive(false),
    );
    ws.connect();
    socketRef.current = ws;
    return () => {
      ws.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [sessionId]);

  // ── Waiting / Scanning state ────────────────────────────────────────────────

  if (!report) {
    const progressPct = totalFiles > 0 ? Math.round((filesScanned / totalFiles) * 100) : 0;
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: C.font }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
          <a href="/" style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: C.text, textDecoration: "none" }}>
            unideploy
          </a>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40,
          padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <StatusBadge status={scanStatus} />
          <div style={{ flex: 1, fontSize: 14, color: C.text }}>
            {scanStatus === "waiting" && "Waiting for CLI to connect and scan..."}
            {scanStatus === "scanning" && `Scanning ${totalFiles > 0 ? `${filesScanned} / ${totalFiles} files` : "files"}...`}
          </div>
        </div>

        {/* Progress bar */}
        {scanStatus === "scanning" && totalFiles > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ height: 6, background: C.surface, borderRadius: 99,
              border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: C.green, borderRadius: 99,
                transition: "width 0.4s ease", width: `${progressPct}%`,
              }} />
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontFamily: C.mono }}>
              {filesScanned} / {totalFiles} files ({progressPct}%)
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>
          {loadError
            ? "Could not load report. The scan may still be running."
            : "Run npx unideploy@latest init in your project and enter the code at unideploy.in/connect"}
        </div>
      </div>
    );
  }

  // ── Report view ─────────────────────────────────────────────────────────────

  const { grade, project_name, framework, files_scanned, total_issues, auto_fixable, findings } = report;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: C.font }}>
      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
        <a href="/" style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: C.text, textDecoration: "none" }}>
          unideploy
        </a>
        <a href="/connect" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
          New scan →
        </a>
      </nav>

      {/* Header: project + grade */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(24px,4vw,34px)", fontWeight: 800,
            color: C.text, letterSpacing: "-0.03em", marginBottom: 6 }}>
            {project_name || "Security Report"}
          </h1>
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.muted, flexWrap: "wrap" }}>
            {framework && <span>Framework: <span style={{ color: C.text }}>{framework}</span></span>}
            <span>Files scanned: <span style={{ color: C.text }}>{files_scanned}</span></span>
          </div>
        </div>
        <SecurityGrade grade={grade} size="lg" />
      </div>

      {/* Severity breakdown */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, marginBottom: 24, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
        <SeverityBar findings={findings} />
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 13, color: C.muted }}>Auto-fixable</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.green, fontFamily: C.display }}>
            {auto_fixable}
          </div>
        </div>
      </div>

      {/* Fix toast */}
      {fixToast && (
        <div style={{
          padding: "12px 16px", background: `${C.green}1A`,
          border: `1px solid ${C.green}66`, borderRadius: 8, marginBottom: 16,
          fontFamily: C.mono, fontSize: 13, color: C.green,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>✓</span> {fixToast}
        </div>
      )}

      {/* Fix status — patching in progress */}
      {fixPhase === "patching" && (
        <div style={{
          padding: "12px 16px", background: `${C.amber}0D`,
          border: `1px solid ${C.amber}33`, borderRadius: 8, marginBottom: 16,
          fontFamily: C.mono, fontSize: 13, color: C.amber,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ animation: "spin 1.2s linear infinite", display: "inline-block" }}>⟳</span>
          FixAgent patching local files…
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Fix with AI button + CLI hint */}
      {auto_fixable > 0 && fixPhase === "idle" && (
        <div style={{
          padding: "12px 16px", background: `${C.green}0D`,
          border: `1px solid ${C.green}33`, borderRadius: 8, marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 13, color: C.green }}>
            {auto_fixable} auto-fix{auto_fixable !== 1 ? "es" : ""} available
          </span>
          {wsActive ? (
            <button
              onClick={() => {
                const ids = findings.filter(f => f.auto_fixable).map(f => f.id);
                posthog.capture("ai_fix_triggered", { fix_count: ids.length, mode: "cli" });
                socketRef.current?.sendApplyFix(ids);
              }}
              style={{
                background: C.green, color: C.bg, border: "none",
                padding: "7px 18px", borderRadius: 6, cursor: "pointer",
                fontWeight: 700, fontSize: 13, fontFamily: C.font,
              }}
            >
              Fix all with AI
            </button>
          ) : (
            <span style={{ fontFamily: C.mono, fontSize: 12, color: C.muted }}>
              Run <strong style={{ color: C.text }}>unideploy fix</strong> in your terminal to apply
            </span>
          )}
        </div>
      )}

      {/* Findings list */}
      {total_issues === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>No issues found</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Your project passes all local security checks.</div>
        </div>
      ) : (
        findings.map(f => {
          const wasFixed = fixedIds.includes(f.id);
          return (
            <div key={f.id} style={{
              opacity: wasFixed ? 0.4 : 1,
              transition: "opacity 0.4s ease",
              position: "relative",
            }}>
              {wasFixed && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1, pointerEvents: "none",
                }}>
                  <span style={{ color: C.green, fontFamily: C.mono, fontSize: 13, fontWeight: 700 }}>
                    ✓ Fixed
                  </span>
                </div>
              )}
              <ReportFindingCard
                f={f}
                onFix={f.auto_fixable && wsActive && fixPhase === "idle" ? () => {
                  socketRef.current?.sendApplyFix([f.id]);
                } : undefined}
              />
            </div>
          );
        })
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            setSelectedIds(new Set(s.findings.filter(f => f.auto_fixable).map(f => f.id)));
          }
        }
      } catch { clearInterval(pollRef.current!); }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current!);
  }, [scanId]);

  const handleStartScan = async () => {
    if (!githubUrl.trim()) return;
    posthog.capture("github_scan_started", { branch });
    const result = await startScan(githubUrl.trim(), branch);
    setScanId(result.scan_id);
    router.replace(`/dashboard?scan_id=${result.scan_id}`);
  };

  const handleFix = async () => {
    if (!scanId || fixing) return;
    setFixing(true);
    posthog.capture("github_pr_fix_triggered", { fix_count: selectedIds.size });
    try {
      const result = await triggerFix(scanId, Array.from(selectedIds));
      setPrResult({ pr_url: result.pr_url, error: result.error });
    } catch (e: unknown) {
      setPrResult({ pr_url: null, error: e instanceof Error ? e.message : "Fix failed" });
    } finally { setFixing(false); }
  };

  const planByFindingId = Object.fromEntries(plans.map(p => [p.finding_id, p]));
  const fixableFindings = scan?.findings.filter(f => f.auto_fixable) ?? [];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: C.font }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
        <a href="/" style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: C.text, textDecoration: "none" }}>
          unideploy
        </a>
        <a href="/connect" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
          CLI session →
        </a>
      </nav>

      <h1 style={{ fontFamily: C.display, fontSize: "clamp(28px,5vw,38px)", fontWeight: 800,
        color: C.text, letterSpacing: "-0.03em", marginBottom: 8 }}>
        Security Scanner
      </h1>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>
        Paste a GitHub repository URL — we'll scan it inside an isolated sandbox.
      </p>

      {!scanId && (
        <div style={{ display: "flex", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
          <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleStartScan()}
            placeholder="https://github.com/you/your-repo"
            style={{ flex: 1, minWidth: 280, padding: "10px 14px", background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
              fontFamily: C.mono, fontSize: 14, outline: "none" }} />
          <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="branch"
            style={{ width: 100, padding: "10px 12px", background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
              fontFamily: C.mono, fontSize: 14, outline: "none" }} />
          <button onClick={handleStartScan} disabled={!githubUrl.trim()} style={{
            padding: "10px 24px", background: C.green, color: C.bg, border: "none",
            borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
            fontFamily: C.font, opacity: githubUrl.trim() ? 1 : 0.4,
          }}>Scan Repo</button>
        </div>
      )}

      {scan && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32,
          padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <StatusBadge status={scan.status} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.text, fontFamily: C.mono }}>
              {scan.github_url.replace("https://github.com/", "")} @ {scan.branch}
            </div>
            {scan.framework && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>framework: {scan.framework}</div>}
          </div>
          {scan.security_grade && <SecurityGrade grade={scan.security_grade} size="md" />}
        </div>
      )}

      {scan && ["queued", "running", "planning"].includes(scan.status) && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 24, marginBottom: 16, animation: "spin 1.5s linear infinite", display: "inline-block" }}>⟳</div>
          <div style={{ fontSize: 14 }}>
            {scan.status === "queued" && "Waiting in queue..."}
            {scan.status === "running" && "Cloning repo and running security checks inside sandbox..."}
            {scan.status === "planning" && "Generating remediation plan..."}
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {scan?.status === "failed" && (
        <div style={{ padding: "20px", background: `${C.red}11`, border: `1px solid ${C.red}33`, borderRadius: 8, color: C.red, fontSize: 14 }}>
          Scan failed: {scan.error ?? "Unknown error"}
        </div>
      )}

      {scan?.status === "done" && (
        <>
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

          {prResult && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderRadius: 8,
              background: prResult.pr_url ? `${C.green}11` : `${C.red}11`,
              border: `1px solid ${prResult.pr_url ? C.green : C.red}33` }}>
              {prResult.pr_url ? (
                <div>
                  <div style={{ color: C.green, fontWeight: 700, marginBottom: 8 }}>✓ Pull Request opened</div>
                  <a href={prResult.pr_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.blue, fontFamily: C.mono, fontSize: 13 }}>{prResult.pr_url}</a>
                </div>
              ) : (
                <div style={{ color: C.red }}>Fix error: {prResult.error}</div>
              )}
            </div>
          )}

          {fixableFindings.length > 0 && !prResult && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 13, color: C.text }}>
                <span style={{ color: C.green, fontWeight: 700 }}>{selectedIds.size}</span> of{" "}
                {fixableFindings.length} auto-fixable selected
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSelectedIds(new Set(fixableFindings.map(f => f.id)))}
                  style={{ padding: "7px 14px", background: "transparent", color: C.muted,
                    border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer",
                    fontSize: 12, fontFamily: C.font }}>Select all</button>
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

          {scan.findings.map(f => (
            <FindingRow key={f.id} f={f} plan={planByFindingId[f.id]}
              selected={selectedIds.has(f.id)}
              onToggle={() => {
                const next = new Set(selectedIds);
                next.has(f.id) ? next.delete(f.id) : next.add(f.id);
                setSelectedIds(next);
              }}
              onFix={f.auto_fixable ? () => { setSelectedIds(new Set([f.id])); handleFix(); } : undefined}
            />
          ))}

          {scan.findings.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>No issues found</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function DashboardContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const scanId = params.get("scan_id");
  const paymentSuccess = params.get("payment") === "success";
  
  const [user, setUser] = useState<AuthResponse | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => {});
  }, []);

  // After a successful payment the DODO webhook may take a few seconds to fire.
  // Poll up to 5× (every 2 s) until the plan tier upgrades away from Free.
  useEffect(() => {
    if (!paymentSuccess) return;
    let attempts = 0;
    const id = setInterval(async () => {
      attempts++;
      try {
        const fresh = await getCurrentUser();
        if (fresh.plan_tier !== "Free" || attempts >= 5) {
          setUser(fresh);
          clearInterval(id);
        }
      } catch {
        clearInterval(id);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [paymentSuccess]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {/* Top Bar for User Info */}
      {user && (
        <div style={{ background: C.surface, padding: "10px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontFamily: C.mono }}>
          <div>
            <span style={{ color: C.muted }}>User: </span>
            <span style={{ color: C.text }}>{user.email}</span>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <span style={{ color: C.muted }}>Tier: </span>
              <span style={{ color: C.green, fontWeight: 700, padding: "2px 8px", background: `${C.green}11`, borderRadius: 4, border: `1px solid ${C.green}33` }}>{user.plan_tier}</span>
            </div>
            <div>
              <span style={{ color: C.muted }}>Scans Left: </span>
              <span style={{ color: C.text, fontWeight: 700 }}>{user.scans_remaining}</span>
            </div>
          </div>
        </div>
      )}

      {paymentSuccess && (
        <div style={{ background: `${C.green}1A`, color: C.green, textAlign: "center", padding: "12px", fontSize: 14, fontWeight: 600, borderBottom: `1px solid ${C.green}33` }}>
          Payment successful! Your tier and AI limits have been updated.
        </div>
      )}

      {sessionId ? (
        <CliReportView sessionId={sessionId} />
      ) : (
        <GithubScanFlow initialScanId={scanId ?? undefined} />
      )}
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
