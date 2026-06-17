"use client";

import { useState, useEffect } from "react";
import { runSecretsAudit, SecretsAuditResponse, SecretsFinding } from "@/lib/api";
import SecurityGrade from "@/components/SecurityGrade";

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

const IGNORE_FILES = [
  { file: ".gitignore", tool: "git" },
  { file: ".dockerignore", tool: "Docker" },
  { file: ".cursorignore", tool: "Cursor" },
  { file: ".cursorindexingignore", tool: "Cursor indexer" },
  { file: ".claudeignore", tool: "Claude Code" },
  { file: ".aiderignore", tool: "Aider" },
  { file: ".codeiumignore", tool: "Codeium/Windsurf" },
  { file: ".continueignore", tool: "Continue" },
  { file: ".clineignore", tool: "Cline" },
  { file: ".geminiignore", tool: "Gemini Code Assist" },
  { file: ".copilotignore", tool: "GitHub Copilot" },
];

export default function SecretsDashboardPage() {
  const [repoPath, setRepoPath] = useState(".");
  const [auditData, setAuditData] = useState<SecretsAuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runSecretsAudit(path);
      setAuditData(data);
    } catch (err: any) {
      setError(err.message || "Failed to run secrets audit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit(".");
  }, []);

  const handleScan = () => {
    fetchAudit(repoPath);
  };

  // Group findings by severity
  const findings = auditData?.findings || [];
  const criticalFindings = findings.filter(f => f.severity === "critical");
  const highFindings = findings.filter(f => f.severity === "high");
  const mediumFindings = findings.filter(f => f.severity === "medium");
  const lowFindings = findings.filter(f => f.severity === "low");

  // Determine status of ignore files
  const getIgnoreStatus = (file: string) => {
    const finding = findings.find(f => f.file === file);
    if (finding) {
      if (finding.type === "ignore_missing") {
        return { label: "Missing", badge: "❌", color: C.red };
      }
      if (finding.type === "ignore_incomplete") {
        return { label: "Incomplete", badge: "⚠️", color: C.amber };
      }
    }
    return { label: "Present", badge: "✅", color: C.green };
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: C.font, color: C.text, minHeight: "100vh", background: C.bg }}>
      {/* Navigation */}
      <nav style={{ display: "flex", gap: 20, marginBottom: 48 }}>
        <a href="/dashboard" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
          Dashboard
        </a>
        <a href="/dashboard/secrets" style={{ fontSize: 13, color: C.text, textDecoration: "none", fontWeight: 700 }}>
          Secrets Audit
        </a>
        <a href="/docs" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
          Docs
        </a>
      </nav>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(24px,4vw,34px)", fontWeight: 800, color: C.text, letterSpacing: "-0.03em", marginBottom: 6 }}>
            Secrets & Credentials Audit
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
            Audit hardcoded keys, secrets, and ignore file coverage across your workspace.
          </p>
        </div>
        {auditData && <SecurityGrade grade={auditData.grade} size="lg" />}
      </div>

      {/* Path Input / Scan triggers */}
      <div style={{ display: "flex", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
        <div style={{ flex: 1, position: "relative", minWidth: 280 }}>
          <span style={{ position: "absolute", left: 14, top: 12, color: C.muted, fontFamily: C.mono, fontSize: 14 }}>path:</span>
          <input
            value={repoPath}
            onChange={e => setRepoPath(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            placeholder="."
            style={{
              width: "100%",
              padding: "10px 14px 10px 55px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              fontFamily: C.mono,
              fontSize: 14,
              outline: "none"
            }}
          />
        </div>
        <button
          onClick={handleScan}
          disabled={loading}
          style={{
            padding: "10px 24px",
            background: C.green,
            color: C.bg,
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: C.font,
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Scanning..." : "Run scan"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "16px 20px", marginBottom: 24, borderRadius: 8, background: `${C.red}11`, border: `1px solid ${C.red}33`, color: C.red, fontSize: 14, fontFamily: C.mono }}>
          ❌ Scan failed: {error}
        </div>
      )}

      {loading && !auditData && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 24, marginBottom: 16, animation: "spin 1.5s linear infinite", display: "inline-block" }}>⟳</div>
          <div style={{ fontSize: 14 }}>Auditing repository posture and checking for exposed credentials...</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {auditData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Summary / Stats Banner */}
          <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, color: C.muted }}>Files Scanned</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.text, fontFamily: C.display }}>{auditData.scanned_files}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.muted }}>Total Findings</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.amber, fontFamily: C.display }}>{findings.length}</div>
            </div>
            <div style={{ textAlign: "right", flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: C.muted }}>Recommendation</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>{auditData.recommendation}</div>
            </div>
          </div>

          {/* Ignore Posture */}
          <div>
            <h2 style={{ fontFamily: C.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Ignore Posture
            </h2>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", color: C.muted, fontWeight: 600 }}>Ignore File</th>
                    <th style={{ padding: "12px 16px", color: C.muted, fontWeight: 600 }}>Target Tool</th>
                    <th style={{ padding: "12px 16px", color: C.muted, fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {IGNORE_FILES.map(({ file, tool }) => {
                    const status = getIgnoreStatus(file);
                    return (
                      <tr key={file} style={{ borderBottom: `1px solid ${C.border}`, opacity: status.label === "Present" ? 0.9 : 1 }}>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono }}>{file}</td>
                        <td style={{ padding: "12px 16px", color: C.muted }}>{tool}</td>
                        <td style={{ padding: "12px 16px", color: status.color, fontWeight: 600 }}>
                          <span style={{ marginRight: 6 }}>{status.badge}</span>
                          {status.label}
                          {(file === ".cursorignore" || file === ".claudeignore") && status.label === "Missing" && (
                            <span style={{ color: C.red, fontSize: 11, marginLeft: 6, fontWeight: 700, textTransform: "uppercase" }}>(Critical!)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Findings */}
          <div>
            <h2 style={{ fontFamily: C.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Exposed Secrets & Vulnerabilities
            </h2>
            {findings.filter(f => !f.type.startsWith("ignore_")).length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>No secrets found — your project looks clean!</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Exposed credentials or credentials leakage in config/ignore files was not detected.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Critical */}
                {criticalFindings.map((f, i) => (
                  <FindingCard key={`crit-${i}`} finding={f} />
                ))}
                {/* High */}
                {highFindings.map((f, i) => (
                  <FindingCard key={`high-${i}`} finding={f} />
                ))}
                {/* Medium */}
                {mediumFindings.map((f, i) => (
                  <FindingCard key={`med-${i}`} finding={f} />
                ))}
                {/* Low */}
                {lowFindings.map((f, i) => (
                  <FindingCard key={`low-${i}`} finding={f} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FindingCard({ finding }: { finding: SecretsFinding }) {
  const [expanded, setExpanded] = useState(false);
  const isIgnoreType = finding.type.startsWith("ignore_");

  if (isIgnoreType) return null;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${severityColor(finding.severity)}`,
        borderRadius: 8,
        overflow: "hidden"
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: severityColor(finding.severity), fontFamily: C.mono, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {finding.severity}
            </span>
            {finding.provider && (
              <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, background: `${C.muted}18`, padding: "1px 6px", borderRadius: 3 }}>
                {finding.provider}
              </span>
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              {finding.description.split(" — ")[0]}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: C.mono }}>
            {finding.file}{finding.line ? `:${finding.line}` : ""}
          </div>
        </div>
        <span style={{ color: C.muted, fontSize: 12, marginLeft: 12, alignSelf: "center" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 12, lineHeight: 1.6 }}>
            {finding.description}
          </p>
          {finding.masked_value && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 4, fontFamily: C.mono }}>
                MASKED VALUE
              </div>
              <pre style={{
                background: "#0A120A",
                padding: "8px 12px",
                borderRadius: 6,
                fontFamily: C.mono,
                fontSize: 12,
                color: C.text,
                margin: 0,
                border: `1px solid ${C.border}`,
              }}>
                {finding.masked_value}
              </pre>
            </div>
          )}
          {finding.fix && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "#0D1D0D", borderRadius: 6, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 6, fontFamily: C.mono }}>
                RECOMMENDED ACTION
              </div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>
                {finding.fix}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
