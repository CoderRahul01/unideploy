"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  BarChart3,
  Shield,
  Code2,
  Download,
  AlertCircle,
  Timer,
  Terminal,
  ExternalLink,
  ChevronRight,
  Zap,
  Globe,
  Lock,
  Boxes
} from "lucide-react";
import { TEMPLATES, SandboxTemplate } from "@/app/api/sandbox/templates/route";

// ── Design Tokens Matching UniDeploy ─────────────────────────────────────────

const C = {
  bg: "#0B0F0C",
  surface: "#121813",
  surfaceCard: "#151F16",
  surfaceHover: "#1A271B",
  surfaceInput: "#090D0A",
  border: "#202E22",
  borderHover: "#2F4232",
  borderActive: "#6DB84A",
  text: "#E8F0D8",
  textSecondary: "#A3B398",
  textMuted: "#6B7C62",
  green: "#6DB84A",
  greenBright: "#22C55E",
  greenLight: "#86EFAC",
  greenGlow: "rgba(109, 184, 74, 0.15)",
  red: "#FF6B6B",
  redBg: "#2A1414",
  amber: "#F0A830",
  blue: "#6AB4F0",
  font: "var(--font-body), DM Sans, sans-serif",
  mono: "var(--font-mono), JetBrains Mono, monospace",
  display: "var(--font-display), Sora, sans-serif",
};

export default function SandboxPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<SandboxTemplate>(TEMPLATES[0]);
  const [code, setCode] = useState<string>(TEMPLATES[0].starterCode);
  const [language, setLanguage] = useState<"python" | "js" | "bash">(TEMPLATES[0].language);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"console" | "visuals" | "export">("console");
  const [exportLang, setExportLang] = useState<"curl" | "python" | "ts" | "mcp">("curl");
  const [copied, setCopied] = useState<boolean>(false);

  // Execution Result State
  const [executionResult, setExecutionResult] = useState<{
    success?: boolean;
    stdout?: string;
    stderr?: string;
    results?: Array<{ type: string; data: string }>;
    durationMs?: number;
    sandboxId?: string;
    error?: string;
    remaining?: number;
  } | null>(null);

  // Timer while running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 100);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleSelectTemplate = (template: SandboxTemplate) => {
    setSelectedTemplate(template);
    setCode(template.starterCode);
    setLanguage(template.language);
    setExecutionResult(null);
    setActiveTab(template.outputType === "chart" ? "visuals" : "console");
  };

  const handleRunSandbox = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionResult(null);

    try {
      const res = await fetch("/api/sandbox/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
          timeoutMs: 30000,
        }),
      });

      const data = await res.json();
      setExecutionResult(data);

      if (data.results && data.results.some((r: any) => r.type.startsWith("image/"))) {
        setActiveTab("visuals");
      } else {
        setActiveTab("console");
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        stderr: err?.message || "Failed to reach sandbox server",
        durationMs: 0,
      });
      setActiveTab("console");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Line numbers calculation for the editor
  const lineCount = useMemo(() => {
    return Math.max(code.split("\n").length, 14);
  }, [code]);

  // Generate code export snippet based on current state
  const getExportSnippet = () => {
    const escapedCode = JSON.stringify(code);

    if (exportLang === "curl") {
      return `curl -X POST https://www.unideploy.in/api/sandbox/run \\
  -H "Content-Type: application/json" \\
  -d '{
    "language": "${language}",
    "code": ${escapedCode}
  }'`;
    }

    if (exportLang === "python") {
      return `import requests

response = requests.post(
    "https://www.unideploy.in/api/sandbox/run",
    json={
        "language": "${language}",
        "code": ${escapedCode}
    },
    timeout=30
)

data = response.json()
print("Success:", data.get("success"))
print("Stdout:\\n", data.get("stdout"))
if data.get("results"):
    print(f"Captured {len(data['results'])} visual artifact(s)")`;
    }

    if (exportLang === "ts") {
      return `const res = await fetch("https://www.unideploy.in/api/sandbox/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    language: "${language}",
    code: ${escapedCode}
  })
});

const result = await res.json();
console.log(result.stdout);`;
    }

    if (exportLang === "mcp") {
      return `{
  "mcpServers": {
    "unideploy-sandbox": {
      "command": "npx",
      "args": ["-y", "@unideploy/mcp"],
      "env": {
        "UNIDEPLOY_API_URL": "https://www.unideploy.in"
      }
    }
  }
}`;
    }

    return "";
  };

  const getActiveFileName = () => {
    if (language === "python") return "runner.py";
    if (language === "js") return "index.js";
    return "script.sh";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: C.font,
        paddingBottom: 120,
      }}
    >
      {/* ── Sub-Nav / Breadcrumb Bar ──────────────────────────────────── */}
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(18, 24, 19, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/"
              style={{
                fontFamily: C.mono,
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                textDecoration: "none",
                letterSpacing: "-0.02em",
              }}
            >
              unideploy
            </Link>
            <span style={{ color: C.textMuted, fontSize: 13 }}>/</span>
            <span
              style={{
                fontFamily: C.mono,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.greenLight,
                background: "rgba(109, 184, 74, 0.12)",
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid rgba(109, 184, 74, 0.25)",
              }}
            >
              Cloud Sandbox Hub
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 14px",
                borderRadius: 999,
                background: C.surfaceCard,
                border: `1px solid ${C.border}`,
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: C.mono,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: C.greenBright,
                  boxShadow: `0 0 8px ${C.greenBright}`,
                  display: "inline-block",
                }}
              />
              <span>$20,000 E2B Sandbox Pool Active</span>
            </div>

            <Link
              href="/download"
              style={{
                fontSize: 13,
                color: C.greenLight,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Download
            </Link>
            <Link
              href="/"
              style={{
                fontSize: 13,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Auditor
            </Link>
            <Link
              href="/pricing"
              style={{
                fontSize: 13,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: "40px 24px 32px",
          maxWidth: 1240,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: C.greenLight,
                fontFamily: C.mono,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              <Sparkles size={14} color={C.greenLight} />
              <span>Firecracker MicroVMs · Zero Setup Compute</span>
            </div>
            <h1
              style={{
                fontFamily: C.display,
                fontSize: 32,
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Agent Environment Marketplace &amp; Sandbox
            </h1>
            <p
              style={{
                fontSize: 15,
                color: C.textSecondary,
                margin: "8px 0 0",
                maxWidth: 680,
                lineHeight: 1.6,
              }}
            >
              Run Python, Node.js, and Linux Bash commands in sub-second disposable microVMs.
              Render Matplotlib charts directly, run AI agent workflows, or integrate via REST API and MCP.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setActiveTab("export")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 8,
                background: C.surfaceCard,
                border: `1px solid ${C.borderHover}`,
                color: C.text,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: C.font,
                transition: "all 0.15s ease",
              }}
            >
              <Code2 size={16} color={C.greenLight} />
              <span>Integrate API / MCP</span>
            </button>
          </div>
        </div>

        {/* ── Template Marketplace Switcher ─────────────────────────── */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontFamily: C.mono,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: C.textMuted,
              marginBottom: 12,
            }}
          >
            Select Sandbox Environment:
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate.id === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  style={{
                    textAlign: "left",
                    padding: "16px 16px 14px",
                    borderRadius: 12,
                    background: isSelected ? "rgba(22, 33, 22, 0.95)" : C.surface,
                    border: isSelected ? `1.5px solid ${C.green}` : `1px solid ${C.border}`,
                    boxShadow: isSelected ? `0 0 16px ${C.greenGlow}` : "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 110,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: C.mono,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: isSelected ? C.greenLight : C.textMuted,
                          background: isSelected ? "rgba(109, 184, 74, 0.2)" : "rgba(255,255,255,0.05)",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {tmpl.badge}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: C.mono,
                          color: C.textMuted,
                        }}
                      >
                        {tmpl.specs.cpu}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#FFFFFF",
                        fontFamily: C.font,
                        lineHeight: 1.3,
                      }}
                    >
                      {tmpl.name}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: C.textSecondary,
                      lineHeight: 1.4,
                      marginTop: 6,
                    }}
                  >
                    {tmpl.description.slice(0, 75)}...
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Main Studio Grid: Editor (Left) & Output (Right) ─────────── */}
      <main
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {/* ── LEFT PANE: Monaco-style Code Editor ────────────────────── */}
          <div
            style={{
              background: C.surface,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Editor Top Titlebar */}
            <div
              style={{
                height: 44,
                background: C.surfaceCard,
                borderBottom: `1px solid ${C.border}`,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* macOS style window dots */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F56", display: "inline-block" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#27C93F", display: "inline-block" }} />
                </div>

                <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: C.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#FFFFFF",
                    }}
                  >
                    {getActiveFileName()}
                  </span>
                  <span
                    style={{
                      fontFamily: C.mono,
                      fontSize: 10,
                      color: C.greenLight,
                      background: "rgba(109, 184, 74, 0.15)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      border: "1px solid rgba(109, 184, 74, 0.3)",
                    }}
                  >
                    {language.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  style={{
                    background: C.surfaceInput,
                    color: C.text,
                    fontFamily: C.mono,
                    fontSize: 11,
                    border: `1px solid ${C.borderHover}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="python">Python 3.13</option>
                  <option value="js">Node.js 20</option>
                  <option value="bash">Debian Bash</option>
                </select>

                <button
                  onClick={() => setCode(selectedTemplate.starterCode)}
                  title="Reset to starter code"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.textMuted,
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Editor Body with Simulated Line Numbers */}
            <div
              style={{
                display: "flex",
                background: C.surfaceInput,
                minHeight: 420,
                position: "relative",
              }}
            >
              {/* Line Numbers Column */}
              <div
                style={{
                  width: 44,
                  padding: "16px 0",
                  textAlign: "right",
                  paddingRight: 12,
                  fontFamily: C.mono,
                  fontSize: 12,
                  lineHeight: "22px",
                  color: "#40503B",
                  userSelect: "none",
                  borderRight: `1px solid rgba(255,255,255,0.04)`,
                }}
              >
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Code Textarea */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "16px",
                  color: "#DDF4CE",
                  fontFamily: C.mono,
                  fontSize: 13,
                  lineHeight: "22px",
                  resize: "none",
                  tabSize: 2,
                  overflowY: "auto",
                }}
              />
            </div>

            {/* Editor Action Bar / Footer */}
            <div
              style={{
                padding: "12px 20px",
                background: C.surfaceCard,
                borderTop: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 12,
                  color: C.textMuted,
                  fontFamily: C.mono,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Cpu size={14} color={C.green} />
                  <span>2 vCPUs · 2GB RAM</span>
                </span>
                <span style={{ color: C.border }}>|</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Timer size={14} color={C.amber} />
                  <span>30s Timeout Ceiling</span>
                </span>
              </div>

              <button
                onClick={handleRunSandbox}
                disabled={isRunning}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  borderRadius: 10,
                  background: isRunning ? "#273822" : C.greenBright,
                  color: isRunning ? C.greenLight : "#06230C",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  boxShadow: isRunning ? "none" : `0 4px 16px rgba(34, 197, 94, 0.35)`,
                  transition: "all 0.15s ease",
                }}
              >
                {isRunning ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #86EFAC",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <span>Running ({Math.round(elapsedTime / 100) / 10}s)...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="#06230C" />
                    <span>Run in Cloud Sandbox</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT PANE: Output Terminal, Visuals & Export ──────────── */}
          <div
            style={{
              background: C.surface,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              minHeight: 520,
            }}
          >
            {/* Output Tabs Header */}
            <div
              style={{
                height: 44,
                background: C.surfaceCard,
                borderBottom: `1px solid ${C.border}`,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  background: C.surfaceInput,
                  padding: 3,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                }}
              >
                <button
                  onClick={() => setActiveTab("console")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    background: activeTab === "console" ? C.surfaceCard : "transparent",
                    color: activeTab === "console" ? C.greenLight : C.textMuted,
                    cursor: "pointer",
                    fontFamily: C.font,
                  }}
                >
                  Console Output
                </button>
                <button
                  onClick={() => setActiveTab("visuals")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    background: activeTab === "visuals" ? C.surfaceCard : "transparent",
                    color: activeTab === "visuals" ? C.greenLight : C.textMuted,
                    cursor: "pointer",
                    fontFamily: C.font,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>Visuals</span>
                  {executionResult?.results && executionResult.results.length > 0 && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: C.greenBright,
                        display: "inline-block",
                      }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("export")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    background: activeTab === "export" ? C.surfaceCard : "transparent",
                    color: activeTab === "export" ? C.greenLight : C.textMuted,
                    cursor: "pointer",
                    fontFamily: C.font,
                  }}
                >
                  Export Code
                </button>
              </div>

              {executionResult?.durationMs !== undefined && (
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    color: C.greenLight,
                    background: "rgba(109, 184, 74, 0.12)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(109, 184, 74, 0.25)",
                  }}
                >
                  ⚡ {(executionResult.durationMs / 1000).toFixed(2)}s
                </div>
              )}
            </div>

            {/* Output Content Area */}
            <div
              style={{
                flex: 1,
                background: C.surfaceInput,
                padding: 16,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* TAB 1: Console Logs */}
              {activeTab === "console" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {isRunning && (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "60px 20px",
                        textAlign: "center",
                        color: C.textSecondary,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          border: `3px solid ${C.greenBright}`,
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          marginBottom: 16,
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
                        Booting Firecracker microVM...
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontFamily: C.mono }}>
                        Zero-contamination container · Compiling code
                      </div>
                    </div>
                  )}

                  {!isRunning && !executionResult && (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "60px 20px",
                        textAlign: "center",
                        color: C.textMuted,
                      }}
                    >
                      <Terminal size={36} color="#384934" style={{ marginBottom: 12 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary }}>
                        Ready for Execution
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                        Click &quot;Run in Cloud Sandbox&quot; to test this environment.
                      </div>
                    </div>
                  )}

                  {!isRunning && executionResult && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {executionResult.stdout && (
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              fontFamily: C.mono,
                              fontWeight: 700,
                              color: C.greenLight,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              marginBottom: 6,
                            }}
                          >
                            ❯ Standard Output:
                          </div>
                          <pre
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              background: "#050805",
                              border: `1px solid ${C.border}`,
                              color: "#E2F0D9",
                              fontFamily: C.mono,
                              fontSize: 12,
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              margin: 0,
                            }}
                          >
                            {executionResult.stdout}
                          </pre>
                        </div>
                      )}

                      {executionResult.stderr && (
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              fontFamily: C.mono,
                              fontWeight: 700,
                              color: C.red,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              marginBottom: 6,
                            }}
                          >
                            Stderr / Diagnostics:
                          </div>
                          <pre
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              background: C.redBg,
                              border: "1px solid rgba(255, 107, 107, 0.3)",
                              color: "#FFB0B0",
                              fontFamily: C.mono,
                              fontSize: 12,
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              margin: 0,
                            }}
                          >
                            {executionResult.stderr}
                          </pre>
                        </div>
                      )}

                      {executionResult.error && (
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            background: C.redBg,
                            border: "1px solid rgba(255, 107, 107, 0.4)",
                            color: "#FFB0B0",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{executionResult.error}</span>
                        </div>
                      )}

                      {executionResult.success && !executionResult.stdout && (
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            background: "#050805",
                            border: `1px solid ${C.border}`,
                            color: C.greenLight,
                            fontSize: 12,
                            fontFamily: C.mono,
                          }}
                        >
                          Execution completed with exit code 0.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Visuals (Matplotlib Plots) */}
              {activeTab === "visuals" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {executionResult?.results && executionResult.results.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {executionResult.results.map((item, idx) => {
                        if (item.type === "image/png" || item.type === "image/svg+xml") {
                          const src =
                            item.type === "image/png"
                              ? `data:image/png;base64,${item.data}`
                              : `data:image/svg+xml;utf8,${encodeURIComponent(item.data)}`;

                          return (
                            <div
                              key={idx}
                              style={{
                                borderRadius: 12,
                                overflow: "hidden",
                                border: `1px solid ${C.border}`,
                                background: "#060A07",
                                padding: 8,
                              }}
                            >
                              <img
                                src={src}
                                alt={`Rendered Plot ${idx + 1}`}
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  borderRadius: 8,
                                  display: "block",
                                }}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 4px 0",
                                }}
                              >
                                <span style={{ fontSize: 11, fontFamily: C.mono, color: C.greenLight }}>
                                  Matplotlib Output #{idx + 1}
                                </span>
                                <a
                                  href={src}
                                  download={`unideploy-plot-${idx + 1}.png`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontSize: 11,
                                    color: C.textSecondary,
                                    textDecoration: "none",
                                  }}
                                >
                                  <Download size={13} />
                                  <span>Download PNG</span>
                                </a>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "60px 20px",
                        textAlign: "center",
                        color: C.textMuted,
                      }}
                    >
                      <BarChart3 size={36} color="#384934" style={{ marginBottom: 12 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary }}>
                        No Visual Charts Yet
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, maxWidth: 280 }}>
                        Select the <strong>Data Science &amp; Plot Engine</strong> template and click Run to render Matplotlib plots.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Code Export / Integrate */}
              {activeTab === "export" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>
                      Drop-in Code Snippet:
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: 2,
                        background: C.surfaceCard,
                        padding: 2,
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {(["curl", "python", "ts", "mcp"] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setExportLang(lang)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontFamily: C.mono,
                            border: "none",
                            background: exportLang === lang ? C.surfaceHover : "transparent",
                            color: exportLang === lang ? C.greenLight : C.textMuted,
                            cursor: "pointer",
                          }}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ position: "relative", flex: 1 }}>
                    <pre
                      style={{
                        margin: 0,
                        padding: 14,
                        borderRadius: 10,
                        background: "#050805",
                        border: `1px solid ${C.border}`,
                        fontFamily: C.mono,
                        fontSize: 12,
                        color: "#C2E8AA",
                        lineHeight: 1.6,
                        overflowX: "auto",
                        height: 280,
                      }}
                    >
                      {getExportSnippet()}
                    </pre>

                    <button
                      onClick={() => handleCopy(getExportSnippet())}
                      title="Copy snippet"
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: C.surfaceCard,
                        border: `1px solid ${C.borderHover}`,
                        color: copied ? C.greenBright : C.text,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontFamily: C.mono,
                      }}
                    >
                      {copied ? (
                        <>
                          <Check size={13} color={C.greenBright} />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      marginTop: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    Invoke <code>POST /api/sandbox/run</code> directly from your backend, or add to your Claude Desktop config file.
                  </div>
                </div>
              )}
            </div>

            {/* Output Footer Bar */}
            <div
              style={{
                height: 38,
                background: C.surfaceCard,
                borderTop: `1px solid ${C.border}`,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: C.mono,
                fontSize: 11,
                color: C.textMuted,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: C.greenBright,
                    display: "inline-block",
                  }}
                />
                <span>Debian 13 Firecracker MicroVM</span>
              </div>

              {executionResult?.sandboxId && (
                <div style={{ color: C.textSecondary }}>
                  VM: {executionResult.sandboxId.slice(0, 16)}...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Value Proposition Cards at the Bottom ─────────────────── */}
        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              background: C.surface,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(109, 184, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Shield size={18} color={C.greenLight} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
              Full Hardware Virtualization
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
              Every execution runs in a dedicated Firecracker microVM with its own isolated kernel. Zero host disk exposure, zero cross-contamination.
            </div>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 12,
              background: C.surface,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(109, 184, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Code2 size={18} color={C.greenLight} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
              Drop-In REST &amp; Webhooks
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
              Execute customer-submitted code in your SaaS, generate charts from Make/n8n, or evaluate code tests with a simple JSON call.
            </div>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 12,
              background: C.surface,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(109, 184, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Sparkles size={18} color={C.greenLight} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
              Claude &amp; Cursor MCP Tools
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
              Plug UniDeploy Sandbox directly into Claude Desktop or Cursor to allow AI to safely browse, run terminal commands, and verify code.
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
