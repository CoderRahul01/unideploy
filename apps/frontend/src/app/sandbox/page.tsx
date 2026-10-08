"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  Sparkles,
  BarChart3,
  Shield,
  Code2,
  Download,
  AlertCircle,
  Timer,
  Terminal,
  Zap,
  Globe,
  Lock,
  Boxes,
  X,
  CreditCard,
  CheckCircle2,
  BookmarkCheck,
  Plus,
  Trash2,
  Folder,
} from "lucide-react";
import { TEMPLATES, SandboxTemplate } from "@/lib/sandbox/templates";

export interface SavedSandbox {
  id: string;
  name: string;
  code: string;
  language: "python" | "js" | "bash";
  createdAt: string;
  updatedAt: string;
}

export interface SavedSandbox {
  id: string;
  name: string;
  code: string;
  language: "python" | "js" | "bash";
  createdAt: string;
  updatedAt: string;
}

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
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<SandboxTemplate>(TEMPLATES[0]);
  const [code, setCode] = useState<string>(TEMPLATES[0].starterCode);
  const [language, setLanguage] = useState<"python" | "js" | "bash">(TEMPLATES[0].language);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"console" | "visuals" | "export">("console");
  const [exportLang, setExportLang] = useState<"curl" | "python" | "ts" | "mcp">("curl");
  const [copied, setCopied] = useState<boolean>(false);

  // Daily Free Quota Tracking (3 runs / day)
  const [runsLeft, setRunsLeft] = useState<number>(3);

  // Custom Saved Sandboxes & Workspace Mode
  const [viewMode, setViewMode] = useState<"templates" | "my-sandboxes">("templates");
  const [savedSandboxes, setSavedSandboxes] = useState<SavedSandbox[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>("");
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Upgrade Modal State
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    title: string;
    subtitle: string;
    highlightTier: "starter" | "pro";
  } | null>(null);

  // Initialize quota from localStorage
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem("unideploy_sbx_quota");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && typeof parsed.runsLeft === "number") {
          setRunsLeft(parsed.runsLeft);
          return;
        }
      }
      localStorage.setItem("unideploy_sbx_quota", JSON.stringify({ date: today, runsLeft: 3 }));
      setRunsLeft(3);
    } catch {
      setRunsLeft(3);
    }
  }, []);

  // Load saved sandboxes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("unideploy_saved_sandboxes");
      if (stored) {
        setSavedSandboxes(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Check URL query parameters for template selection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tmplId = params.get("template");
      if (tmplId) {
        const found = TEMPLATES.find((t) => t.id === tmplId);
        if (found) {
          setSelectedTemplate(found);
          setCode(found.starterCode);
          setLanguage(found.language);
          setActiveTab(found.outputType === "chart" ? "visuals" : "console");
        }
      }
    }
  }, []);

  const persistSavedSandboxes = (items: SavedSandbox[]) => {
    setSavedSandboxes(items);
    try {
      localStorage.setItem("unideploy_saved_sandboxes", JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleOpenSaveModal = () => {
    if (activeSavedId) {
      const existing = savedSandboxes.find((s) => s.id === activeSavedId);
      if (existing) {
        setSaveName(existing.name);
      }
    } else {
      setSaveName(selectedTemplate.name + " (Custom)");
    }
    setSaveModalOpen(true);
  };

  const handleSaveSandbox = (name: string) => {
    const cleanName = name.trim() || "Untitled Custom Sandbox";
    const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    let updatedList: SavedSandbox[];
    if (activeSavedId) {
      updatedList = savedSandboxes.map((s) => {
        if (s.id === activeSavedId) {
          return { ...s, name: cleanName, code, language, updatedAt: now };
        }
        return s;
      });
    } else {
      const newId = "sbx_" + Math.random().toString(36).substring(2, 9);
      const newSandbox: SavedSandbox = {
        id: newId,
        name: cleanName,
        code,
        language,
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [newSandbox, ...savedSandboxes];
      setActiveSavedId(newId);
    }
    persistSavedSandboxes(updatedList);
    setSaveModalOpen(false);
    setSaveSuccessToast(`Saved "${cleanName}" to your workspace!`);
    setTimeout(() => setSaveSuccessToast(null), 3000);
  };

  const handleLoadSavedSandbox = (item: SavedSandbox) => {
    setActiveSavedId(item.id);
    setCode(item.code);
    setLanguage(item.language);
    setExecutionResult(null);
    setActiveTab("console");
  };

  const handleDeleteSavedSandbox = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedSandboxes.filter((s) => s.id !== id);
    persistSavedSandboxes(filtered);
    if (activeSavedId === id) {
      setActiveSavedId(null);
    }
  };

  const handleNewBlankSandbox = () => {
    setActiveSavedId(null);
    setCode("# Custom Python Sandbox\n# Write your code or data pipeline below:\n\nprint('Hello from UniDeploy Cloud Sandbox!')\n");
    setLanguage("python");
    setExecutionResult(null);
    setActiveTab("console");
    setViewMode("my-sandboxes");
  };

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
    setActiveSavedId(null);
    setSelectedTemplate(template);
    setCode(template.starterCode);
    setLanguage(template.language);
    setExecutionResult(null);
    setActiveTab(template.outputType === "chart" ? "visuals" : "console");
  };

  const handleRunSandbox = async () => {
    if (isRunning) return;

    // Check daily quota
    if (runsLeft <= 0) {
      setUpgradeModal({
        open: true,
        title: "Daily Free MicroVM Quota Reached",
        subtitle:
          "You have used your 3 free cloud sessions today. Unlock 20 hours of persistent compute on the Starter plan for ₹499/month (~$6) with instant UPI or card checkout.",
        highlightTier: "starter",
      });
      return;
    }

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

      // Decrement daily quota on run
      setRunsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem("unideploy_sbx_quota", JSON.stringify({ date: today, runsLeft: next }));
        } catch {}
        return next;
      });

      if (data.results && data.results.some((r: { type: string; data: string }) => r.type.startsWith("image/"))) {
        setActiveTab("visuals");
      } else {
        setActiveTab("console");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reach sandbox server";
      setExecutionResult({
        success: false,
        stderr: errorMsg,
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

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              <span>Dedicated MicroVM Compute Pool Active</span>
            </div>

            {/* Daily Free Runs Badge & Upgrade Trigger */}
            <button
              onClick={() =>
                setUpgradeModal({
                  open: true,
                  title: "Unlock Unlimited MicroVM Compute",
                  subtitle:
                    "Starter includes 20 compute hours, persistent files, and 5-minute timeouts with instant UPI or Card checkout.",
                  highlightTier: "starter",
                })
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                background: runsLeft > 0 ? "rgba(109, 184, 74, 0.12)" : "rgba(255, 107, 107, 0.15)",
                border: `1px solid ${runsLeft > 0 ? "rgba(109, 184, 74, 0.3)" : "rgba(255, 107, 107, 0.3)"}`,
                fontSize: 12,
                color: runsLeft > 0 ? C.greenLight : C.red,
                fontFamily: C.mono,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Click to upgrade quota"
            >
              <Zap size={13} color={runsLeft > 0 ? C.greenLight : C.red} />
              <span>{runsLeft}/3 Free Daily Runs</span>
            </button>

            <Link
              href="/download"
              style={{
                fontSize: 13,
                color: C.greenLight,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Marketplace
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
            <Link
              href="/getting-started"
              style={{
                fontSize: 13,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Docs
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
              <span>Isolated MicroVMs · Zero Local Setup</span>
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
              Cloud MicroVM Sandbox &amp; Python Runner
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
              Run Python, data science scripts, and AI code in isolated cloud microVMs booting in under 2 seconds.
              Renders high-DPI charts directly in your browser, stays persistent without random disconnects, and exports to live APIs with 1 click.
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

        {/* ── View Switcher: Marketplace Templates vs My Saved Sandboxes ── */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                gap: 6,
                background: C.surface,
                padding: 4,
                borderRadius: 10,
                border: `1px solid ${C.border}`,
              }}
            >
              <button
                onClick={() => setViewMode("templates")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: C.font,
                  background: viewMode === "templates" ? "rgba(109, 184, 74, 0.2)" : "transparent",
                  color: viewMode === "templates" ? "#FFFFFF" : C.textMuted,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: viewMode === "templates" ? C.borderActive : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <Boxes size={14} color={viewMode === "templates" ? C.greenLight : C.textMuted} />
                <span>Marketplace Templates ({TEMPLATES.length})</span>
              </button>

              <button
                onClick={() => setViewMode("my-sandboxes")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: C.font,
                  background: viewMode === "my-sandboxes" ? "rgba(109, 184, 74, 0.2)" : "transparent",
                  color: viewMode === "my-sandboxes" ? "#FFFFFF" : C.textMuted,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: viewMode === "my-sandboxes" ? C.borderActive : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <BookmarkCheck size={14} color={viewMode === "my-sandboxes" ? C.greenLight : C.textMuted} />
                <span>My Saved Sandboxes ({savedSandboxes.length})</span>
              </button>
            </div>

            {viewMode === "my-sandboxes" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={handleNewBlankSandbox}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 7,
                    background: C.surfaceCard,
                    border: `1px solid ${C.borderHover}`,
                    color: C.greenLight,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: C.font,
                  }}
                >
                  <Plus size={13} />
                  <span>New Blank Sandbox</span>
                </button>
                <button
                  onClick={() =>
                    setUpgradeModal({
                      open: true,
                      title: "Persistent Cloud Sync & Storage",
                      subtitle:
                        "Sync all your custom sandboxes to your private cloud storage with persistent 20GB SSD volumes and background execution on the Starter tier (₹499/mo).",
                      highlightTier: "starter",
                    })
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 7,
                    background: "rgba(109, 184, 74, 0.12)",
                    border: `1px solid rgba(109, 184, 74, 0.3)`,
                    color: C.greenLight,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: C.font,
                  }}
                >
                  <Lock size={12} color={C.greenLight} />
                  <span>Sync to Cloud (₹499)</span>
                </button>
              </div>
            )}
          </div>

          {/* VIEW: MARKETPLACE TEMPLATES */}
          {viewMode === "templates" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id && !activeSavedId;
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
          )}

          {/* VIEW: MY SAVED SANDBOXES */}
          {viewMode === "my-sandboxes" && (
            <div>
              {savedSandboxes.length === 0 ? (
                <div
                  style={{
                    background: C.surface,
                    borderRadius: 14,
                    border: `1px dashed ${C.borderHover}`,
                    padding: "36px 24px",
                    textAlign: "center",
                  }}
                >
                  <Folder size={36} color={C.textMuted} style={{ margin: "0 auto 12px", opacity: 0.7 }} />
                  <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                    No Saved Sandboxes Yet
                  </h4>
                  <p style={{ margin: "0 auto 20px", fontSize: 13, color: C.textSecondary, maxWidth: 460, lineHeight: 1.5 }}>
                    Customize any code in the editor or start fresh, then click &ldquo;Save Sandbox&rdquo; in the editor header to save your work.
                  </p>
                  <button
                    onClick={handleNewBlankSandbox}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 18px",
                      borderRadius: 8,
                      background: C.greenBright,
                      color: "#06230C",
                      fontSize: 13,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: C.font,
                    }}
                  >
                    <Plus size={14} />
                    <span>Create Blank Sandbox</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 12,
                  }}
                >
                  {savedSandboxes.map((item) => {
                    const isActive = activeSavedId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleLoadSavedSandbox(item)}
                        style={{
                          textAlign: "left",
                          padding: "16px 16px 14px",
                          borderRadius: 12,
                          background: isActive ? "rgba(22, 33, 22, 0.95)" : C.surface,
                          border: isActive ? `1.5px solid ${C.green}` : `1px solid ${C.border}`,
                          boxShadow: isActive ? `0 0 16px ${C.greenGlow}` : "none",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: 120,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: C.mono,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                color: C.greenLight,
                                background: "rgba(109, 184, 74, 0.15)",
                                padding: "2px 7px",
                                borderRadius: 4,
                              }}
                            >
                              {item.language.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.textMuted }}>
                              {item.updatedAt}
                            </span>
                          </div>

                          <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", fontFamily: C.font, marginBottom: 4 }}>
                            {item.name}
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              fontFamily: C.mono,
                              color: C.textMuted,
                              background: C.surfaceInput,
                              padding: "4px 8px",
                              borderRadius: 4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.code.slice(0, 50).replace(/\n/g, " ")}...
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                          <span style={{ fontSize: 11, color: isActive ? C.greenLight : C.textSecondary, fontWeight: 600 }}>
                            {isActive ? "● Loaded in Editor" : "Click to Open"}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSavedSandbox(item.id, e)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: C.textMuted,
                              cursor: "pointer",
                              padding: 4,
                              borderRadius: 4,
                            }}
                            title="Delete saved sandbox"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
                    {activeSavedId
                      ? savedSandboxes.find((s) => s.id === activeSavedId)?.name || getActiveFileName()
                      : getActiveFileName()}
                  </span>
                  {activeSavedId && (
                    <span
                      style={{
                        fontFamily: C.mono,
                        fontSize: 9,
                        color: C.greenLight,
                        background: "rgba(109, 184, 74, 0.2)",
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontWeight: 700,
                      }}
                    >
                      SAVED
                    </span>
                  )}
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

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={handleOpenSaveModal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(109, 184, 74, 0.14)",
                    border: `1px solid rgba(109, 184, 74, 0.35)`,
                    color: C.greenBright,
                    fontSize: 11,
                    fontFamily: C.mono,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title="Save this code to your workspace"
                >
                  <BookmarkCheck size={12} color={C.greenBright} />
                  <span>{activeSavedId ? "Save Changes" : "Save Sandbox"}</span>
                </button>

                <button
                  onClick={() =>
                    setUpgradeModal({
                      open: true,
                      title: "Extended 5-Minute Execution Timeouts",
                      subtitle:
                        "Free sandboxes have a strict 30-second ceiling. Unlock 5-minute sustained microVM execution for data pipelines, AI models, and scrapers on the Starter tier (₹499/mo).",
                      highlightTier: "starter",
                    })
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    color: C.textMuted,
                    fontSize: 11,
                    fontFamily: C.mono,
                    cursor: "pointer",
                  }}
                  title="Click to unlock 5-minute timeouts"
                >
                  <Timer size={12} color={C.amber} />
                  <span>30s Limit</span>
                  <Lock size={10} color={C.textMuted} />
                </button>

                <button
                  onClick={() =>
                    setUpgradeModal({
                      open: true,
                      title: "Persistent MicroVM State & Memory",
                      subtitle:
                        "Keep installed pip/npm packages, cached datasets, and Python memory alive across re-runs. Available on the Starter tier (₹499/mo) with instant UPI checkout.",
                      highlightTier: "starter",
                    })
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(109, 184, 74, 0.08)",
                    border: `1px solid rgba(109, 184, 74, 0.25)`,
                    color: C.greenLight,
                    fontSize: 11,
                    fontFamily: C.mono,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title="Persist memory and filesystem state across re-runs"
                >
                  <Lock size={12} color={C.greenLight} />
                  <span>Persist State</span>
                  <span style={{ fontSize: 9, opacity: 0.75, background: "rgba(109, 184, 74, 0.2)", padding: "1px 4px", borderRadius: 3 }}>
                    ₹499
                  </span>
                </button>

                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "python" | "js" | "bash")}
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
                <button
                  onClick={() =>
                    setUpgradeModal({
                      open: true,
                      title: "Extended Execution Timeouts",
                      subtitle:
                        "Free sandboxes have a 30-second ceiling. Upgrade to Starter (₹499/mo) or Pro for 5-minute to 1-hour sustained microVM execution.",
                      highlightTier: "starter",
                    })
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: C.textMuted,
                    fontFamily: C.mono,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  title="Click to unlock 5-minute to 1-hour timeouts"
                >
                  <Timer size={14} color={C.amber} />
                  <span style={{ textDecoration: "underline", textDecorationStyle: "dotted" }}>
                    30s Timeout Ceiling
                  </span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() =>
                    setUpgradeModal({
                      open: true,
                      title: "Deploy Live HTTPS Endpoint",
                      subtitle:
                        "Turn this script into an authenticated production HTTP microservice with dedicated bearer API keys, auto-scaling, and uptime monitoring on the Pro plan (₹1,499/mo).",
                      highlightTier: "pro",
                    })
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: C.surface,
                    border: `1px solid ${C.borderHover}`,
                    color: C.text,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title="Deploy as permanent live API"
                >
                  <Globe size={14} color={C.greenLight} />
                  <span>Deploy as Live API</span>
                  <span
                    style={{
                      fontSize: 10,
                      background: "rgba(109, 184, 74, 0.2)",
                      color: C.greenLight,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontFamily: C.mono,
                    }}
                  >
                    PRO
                  </span>
                </button>

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
                              {/* eslint-disable-next-line @next/next/no-img-element */}
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

        {/* ── High-Converting Subscription Banner ────────────────────── */}
        <div
          style={{
            marginTop: 40,
            padding: "28px 32px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(18, 28, 19, 0.95) 0%, rgba(13, 20, 14, 0.95) 100%)",
            border: `1px solid ${C.borderHover}`,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontFamily: C.mono,
                fontWeight: 700,
                color: C.greenLight,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              <Zap size={13} color={C.greenLight} />
              <span>Upgrade to Production Compute</span>
            </div>
            <h3
              style={{
                fontFamily: C.display,
                fontSize: 22,
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              Need Persistent Files, Custom Packages &amp; Live API Endpoints?
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>
              Unlock 20 compute hours, persistent kernels that never wipe your memory, and 1-click model API deployments.
              Tailored for Indian and global developers with instant UPI, RuPay &amp; Card checkout via Dodo Payments.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() =>
                setUpgradeModal({
                  open: true,
                  title: "Upgrade to Starter MicroVM Compute",
                  subtitle:
                    "Get 20 hours of persistent microVM compute, 500k tokens, and live endpoints for ₹499/month (~$6). Instant UPI & Card checkout.",
                  highlightTier: "starter",
                })
              }
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                background: C.greenBright,
                color: "#06230C",
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(34, 197, 94, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              Get Starter for ₹499/mo
            </button>
            <Link
              href="/pricing"
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                background: C.surfaceCard,
                border: `1px solid ${C.border}`,
                color: C.textSecondary,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              Compare All Plans
            </Link>
          </div>
        </div>

        {/* ── Value Proposition Cards at the Bottom ─────────────────── */}
        <div
          style={{
            marginTop: 32,
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

      {/* ── Interactive Upgrade Modal (Dodo Payments / Pricing) ──────── */}
      {upgradeModal?.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setUpgradeModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 680,
              background: C.surface,
              borderRadius: 16,
              border: `1px solid ${C.borderHover}`,
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(109, 184, 74, 0.15)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${C.border}`,
                background: C.surfaceCard,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontFamily: C.mono,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: C.greenLight,
                    marginBottom: 6,
                  }}
                >
                  <Sparkles size={13} color={C.greenLight} />
                  <span>Production Cloud MicroVMs</span>
                </div>
                <h3
                  style={{
                    fontFamily: C.display,
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {upgradeModal.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: C.textSecondary,
                    margin: "6px 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {upgradeModal.subtitle}
                </p>
              </div>

              <button
                onClick={() => setUpgradeModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.textMuted,
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Side-by-Side Tier Selection */}
            <div
              style={{
                padding: 24,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {/* Starter Tier Card */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: upgradeModal.highlightTier === "starter" ? "rgba(22, 33, 22, 0.9)" : C.surfaceCard,
                  border: upgradeModal.highlightTier === "starter" ? `1.5px solid ${C.greenBright}` : `1px solid ${C.border}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>Starter Tier</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: C.mono,
                        fontWeight: 700,
                        color: C.greenLight,
                        background: "rgba(109, 184, 74, 0.15)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      POPULAR
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF", fontFamily: C.display }}>₹499</span>
                    <span style={{ fontSize: 13, color: C.textMuted }}>/ month (~$6)</span>
                  </div>
                  <ul style={{ margin: "0 0 16px", paddingLeft: 0, listStyle: "none", fontSize: 12, color: C.textSecondary, lineHeight: 2 }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> 20 Compute Hours on MicroVMs
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> Persistent memory &amp; file storage
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> 5-minute sustained execution timeout
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> 1 deployed model API endpoint
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> Instant UPI, RuPay &amp; Card checkout
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setUpgradeModal(null);
                    router.push("/pricing");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: C.greenBright,
                    color: "#06230C",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)",
                  }}
                >
                  Upgrade to Starter — ₹499
                </button>
              </div>

              {/* Pro Tier Card */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: upgradeModal.highlightTier === "pro" ? "rgba(22, 33, 22, 0.9)" : C.surfaceCard,
                  border: upgradeModal.highlightTier === "pro" ? `1.5px solid ${C.greenBright}` : `1px solid ${C.border}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>Pro Tier</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: C.mono,
                        fontWeight: 700,
                        color: C.amber,
                        background: "rgba(240, 168, 48, 0.15)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      AGENTS &amp; APIS
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF", fontFamily: C.display }}>₹1,499</span>
                    <span style={{ fontSize: 13, color: C.textMuted }}>/ month (~$18)</span>
                  </div>
                  <ul style={{ margin: "0 0 16px", paddingLeft: 0, listStyle: "none", fontSize: 12, color: C.textSecondary, lineHeight: 2 }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> 80 Compute Hours on MicroVMs
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> 3 live deployed API endpoints + keys
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> Unlimited disposable sandboxes
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> Priority compute queue (&lt; 1.2s boot)
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} color={C.greenBright} /> Full MCP agent tools integration
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setUpgradeModal(null);
                    router.push("/pricing");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: C.surface,
                    border: `1px solid ${C.borderHover}`,
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Get Pro — ₹1,499
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "12px 24px",
                borderTop: `1px solid ${C.border}`,
                background: C.surfaceInput,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                color: C.textMuted,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={14} color={C.greenLight} />
                <span>Instant UPI, RuPay, Visa, Mastercard via Dodo Payments</span>
              </div>
              <Link
                href="/pricing"
                onClick={() => setUpgradeModal(null)}
                style={{ color: C.greenLight, textDecoration: "none", fontWeight: 600 }}
              >
                View all plans &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Sandbox Modal ────────────────────────────────────── */}
      {saveModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: C.surface,
              borderRadius: 16,
              border: `1px solid ${C.borderActive}`,
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BookmarkCheck size={18} color={C.greenBright} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#FFFFFF", fontFamily: C.display }}>
                  {activeSavedId ? "Update Saved Sandbox" : "Save Sandbox to Workspace"}
                </h3>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontFamily: C.mono,
                  color: C.textSecondary,
                  marginBottom: 8,
                }}
              >
                Sandbox Name:
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. My Custom Financial Analyzer"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveSandbox(saveName);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: C.surfaceInput,
                  border: `1px solid ${C.borderHover}`,
                  color: "#FFFFFF",
                  fontFamily: C.font,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Upsell Callout for Cloud Sync */}
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(109, 184, 74, 0.08)",
                  border: `1px solid rgba(109, 184, 74, 0.25)`,
                  fontSize: 12,
                  color: C.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: C.greenLight, fontWeight: 600 }}>☁️ Cloud Sync &amp; Persistent SSD: </span>
                Saved in your browser workspace. Upgrade to{" "}
                <Link
                  href="/pricing"
                  onClick={() => setSaveModalOpen(false)}
                  style={{ color: C.greenBright, fontWeight: 700, textDecoration: "underline" }}
                >
                  Starter (₹499/mo)
                </Link>{" "}
                to sync sandboxes across devices with 20GB persistent disk and live model deployment keys.
              </div>
            </div>

            <div
              style={{
                padding: "14px 24px",
                borderTop: `1px solid ${C.border}`,
                background: C.surfaceInput,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setSaveModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveSandbox(saveName)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  background: C.greenBright,
                  border: "none",
                  color: "#06230C",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)",
                }}
              >
                {activeSavedId ? "Save Changes" : "Save to Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Success Toast ────────────────────────────────────── */}
      {saveSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "rgba(18, 28, 19, 0.95)",
            border: `1px solid ${C.greenBright}`,
            color: "#FFFFFF",
            padding: "12px 18px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.6)",
            zIndex: 99999,
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
          }}
        >
          <CheckCircle2 size={16} color={C.greenBright} />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
