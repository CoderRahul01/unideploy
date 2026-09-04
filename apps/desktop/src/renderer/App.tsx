import React, { useState, useEffect } from "react";
import {
  Play,
  Layers,
  Sparkles,
  Code2,
  Terminal,
  Cpu,
  Key,
  Globe,
  Copy,
  Check,
  Zap,
  ExternalLink,
  ShieldCheck,
  Database,
  ArrowRight,
} from "lucide-react";

declare global {
  interface Window {
    unideploy?: {
      runSandbox: (payload: { language: string; code: string; timeoutMs?: number }) => Promise<any>;
      deployModel: (payload: { name: string; framework: string; description?: string }) => Promise<any>;
      invokeModel: (modelId: string, apiKey: string, payload: any) => Promise<any>;
      getAuth: () => Promise<{ token: string | null; email: string | null; tokensRemaining: number }>;
      setAuth: (token: string, email?: string) => Promise<{ success: boolean }>;
      openExternal: (url: string) => void;
    };
  }
}

const C = {
  bg: "#0B0F0C",
  surface: "#121813",
  surfaceCard: "#151F16",
  surfaceHover: "#1A271B",
  surfaceInput: "#090D0A",
  border: "#202E22",
  borderHover: "#2F4232",
  green: "#6DB84A",
  greenBright: "#22C55E",
  greenLight: "#86EFAC",
  greenGlow: "rgba(109, 184, 74, 0.15)",
  text: "#E8F0D8",
  textSecondary: "#A3B398",
  textMuted: "#6B7C62",
  mono: "var(--font-mono), JetBrains Mono, monospace",
  display: "var(--font-display), Sora, sans-serif",
};

const TEMPLATES = [
  {
    id: "colab-python",
    name: "Google Colab Alternative",
    badge: "Persistent MicroVM",
    language: "python" as const,
    code: `import numpy as np
import matplotlib.pyplot as plt

# Persistent Python 3.11 MicroVM — Never disconnects unexpectedly
x = np.linspace(0, 10, 100)
y = np.sin(x) * np.exp(-0.1 * x)

plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(6, 3), dpi=100)
ax.plot(x, y, color='#22C55E', linewidth=2, label='Damped Wave')
ax.set_title('UniDeploy Cloud Sandbox Simulation', color='#f3f4f6')
ax.legend()
plt.show()

print(f"Computed {len(x)} points. Max amplitude: {np.max(y):.4f}")
print("Status: Cloud microVM execution persistent and active.")`,
  },
  {
    id: "node-runtime",
    name: "Node.js 20 Backend",
    badge: "Fastest Sub-Second",
    language: "js" as const,
    code: `const crypto = require('crypto');

const session = {
  id: "vm_" + crypto.randomBytes(8).toString('hex'),
  region: "in-mumbai-firecracker",
  timestamp: new Date().toISOString(),
  specs: "2 vCPUs · 2 GB RAM"
};

console.log("Allocated MicroVM Session:");
console.table([session]);`,
  },
  {
    id: "cloud-terminal",
    name: "Linux Cloud Terminal",
    badge: "Root Shell",
    language: "bash" as const,
    code: `echo "=== Cloud Firecracker Environment ==="
uname -a
echo ""
python3 --version
node --version
curl --version | head -n 1`,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"sandbox" | "deploy" | "pricing" | "settings">("sandbox");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [auth, setAuth] = useState<{ token: string | null; email: string | null; tokensRemaining: number }>({
    token: null,
    email: null,
    tokensRemaining: 50000,
  });

  // Model deployment state
  const [modelName, setModelName] = useState("sentiment-agent-api");
  const [framework, setFramework] = useState("fastapi");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedModels, setDeployedModels] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (window.unideploy?.getAuth) {
      window.unideploy.getAuth().then((res) => {
        if (res) setAuth(res);
      });
    }
  }, []);

  const handleSelectTemplate = (t: typeof TEMPLATES[0]) => {
    setSelectedTemplate(t);
    setCode(t.code);
    setOutput(null);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);
    try {
      if (window.unideploy?.runSandbox) {
        const res = await window.unideploy.runSandbox({
          language: selectedTemplate.language,
          code,
        });
        setOutput(res);
      } else {
        // Fallback directly to API
        const res = await fetch("https://www.unideploy.in/api/sandbox/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: selectedTemplate.language, code }),
        });
        const data = await res.json();
        setOutput(data);
      }
    } catch (err: any) {
      setOutput({ success: false, stderr: err.message || "Failed to execute sandbox" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeployModel = async () => {
    setIsDeploying(true);
    try {
      if (window.unideploy?.deployModel) {
        const res = await window.unideploy.deployModel({ name: modelName, framework });
        if (res?.data) {
          setDeployedModels((prev) => [res.data, ...prev]);
        }
      } else {
        const res = await fetch("https://unideploy-api.rahulpandey-creates.workers.dev/api/v1/models/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modelName, framework }),
        });
        const data = await res.json();
        if (data?.data) {
          setDeployedModels((prev) => [data.data, ...prev]);
        }
      }
    } catch (err: any) {
      alert("Deployment error: " + err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 240,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "54px 16px 20px",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6DB84A 0%, #15803D 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#0B0F0C",
              fontSize: 14,
            }}
          >
            U
          </div>
          <div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
              UniDeploy
            </div>
            <div style={{ fontSize: 10, fontFamily: C.mono, color: C.greenLight }}>macOS Native Client</div>
          </div>
        </div>

        {/* Navigation items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <button
            onClick={() => setActiveTab("sandbox")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              background: activeTab === "sandbox" ? C.surfaceCard : "transparent",
              border: activeTab === "sandbox" ? `1px solid ${C.borderHover}` : "1px solid transparent",
              color: activeTab === "sandbox" ? "#FFFFFF" : C.textSecondary,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            <Cpu size={16} color={activeTab === "sandbox" ? C.greenLight : C.textMuted} />
            <span>Cloud Sandboxes</span>
          </button>

          <button
            onClick={() => setActiveTab("deploy")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              background: activeTab === "deploy" ? C.surfaceCard : "transparent",
              border: activeTab === "deploy" ? `1px solid ${C.borderHover}` : "1px solid transparent",
              color: activeTab === "deploy" ? "#FFFFFF" : C.textSecondary,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            <Zap size={16} color={activeTab === "deploy" ? C.greenLight : C.textMuted} />
            <span>Deploy Models</span>
          </button>

          <button
            onClick={() => setActiveTab("pricing")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              background: activeTab === "pricing" ? C.surfaceCard : "transparent",
              border: activeTab === "pricing" ? `1px solid ${C.borderHover}` : "1px solid transparent",
              color: activeTab === "pricing" ? "#FFFFFF" : C.textSecondary,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            <Sparkles size={16} color={activeTab === "pricing" ? C.greenLight : C.textMuted} />
            <span>Credits &amp; Plans</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              background: activeTab === "settings" ? C.surfaceCard : "transparent",
              border: activeTab === "settings" ? `1px solid ${C.borderHover}` : "1px solid transparent",
              color: activeTab === "settings" ? "#FFFFFF" : C.textSecondary,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            <Key size={16} color={activeTab === "settings" ? C.greenLight : C.textMuted} />
            <span>API Keys &amp; Auth</span>
          </button>
        </nav>

        {/* Free trial badge */}
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "rgba(109, 184, 74, 0.08)",
            border: "1px solid rgba(109, 184, 74, 0.25)",
          }}
        >
          <div style={{ fontSize: 11, fontFamily: C.mono, color: C.greenLight, fontWeight: 700 }}>
            TRIAL ACTIVE
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", marginTop: 2 }}>
            {auth.tokensRemaining.toLocaleString()} Tokens
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Zero setup cloud compute pool
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top title bar drag handle */}
        <header
          style={{
            height: 48,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px 0 80px",
            background: "rgba(18, 24, 19, 0.6)",
          }}
        >
          <div style={{ fontSize: 12, fontFamily: C.mono, color: C.textSecondary }}>
            Region: <span style={{ color: C.greenBright }}>in-mumbai-firecracker</span> · E2B MicroVMs
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => window.unideploy?.openExternal("https://unideploy.in")}
              style={{
                background: "none",
                border: "none",
                color: C.textSecondary,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>unideploy.in</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </header>

        {/* Tab 1: Cloud Sandboxes */}
        {activeTab === "sandbox" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 20, gap: 16 }}>
            {/* Template selector pills */}
            <div style={{ display: "flex", gap: 10 }}>
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: selectedTemplate.id === t.id ? C.surfaceCard : C.surface,
                    border: selectedTemplate.id === t.id ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                    color: selectedTemplate.id === t.id ? "#FFFFFF" : C.textSecondary,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{t.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: C.mono,
                      color: C.greenLight,
                      background: "rgba(109, 184, 74, 0.15)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {t.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Editor and Output split */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 0 }}>
              {/* Code Box */}
              <div
                style={{
                  background: C.surfaceInput,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "8px 14px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: C.surface,
                  }}
                >
                  <span style={{ fontSize: 12, fontFamily: C.mono, color: C.textSecondary }}>
                    main.{selectedTemplate.language === "python" ? "py" : selectedTemplate.language === "js" ? "js" : "sh"}
                  </span>
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: C.green,
                      color: "#0B0F0C",
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: isRunning ? "not-allowed" : "pointer",
                      opacity: isRunning ? 0.6 : 1,
                    }}
                  >
                    <Play size={13} fill="#0B0F0C" />
                    <span>{isRunning ? "Executing MicroVM..." : "Run MicroVM"}</span>
                  </button>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: C.text,
                    border: "none",
                    padding: 14,
                    fontFamily: C.mono,
                    fontSize: 12,
                    lineHeight: 1.6,
                    resize: "none",
                    outline: "none",
                  }}
                />
              </div>

              {/* Output Box */}
              <div
                style={{
                  background: C.surfaceInput,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "8px 14px",
                    borderBottom: `1px solid ${C.border}`,
                    background: C.surface,
                    fontSize: 12,
                    fontFamily: C.mono,
                    color: C.textSecondary,
                  }}
                >
                  Output Console {output?.durationMs && `(${output.durationMs}ms)`}
                </div>
                <div style={{ flex: 1, padding: 14, overflowY: "auto", fontFamily: C.mono, fontSize: 12 }}>
                  {!output && !isRunning && (
                    <div style={{ color: C.textMuted }}>Press "Run MicroVM" to execute code in isolated cloud sandbox...</div>
                  )}
                  {isRunning && <div style={{ color: C.amber }}>Allocating microVM &amp; executing code...</div>}
                  {output?.stdout && (
                    <pre style={{ color: "#86EFAC", whiteSpace: "pre-wrap", marginBottom: 10 }}>{output.stdout}</pre>
                  )}
                  {output?.stderr && (
                    <pre style={{ color: "#FF6B6B", whiteSpace: "pre-wrap", marginBottom: 10 }}>{output.stderr}</pre>
                  )}
                  {output?.results?.map((r: any, i: number) => {
                    if (r.type === "image/png") {
                      return (
                        <img
                          key={i}
                          src={`data:image/png;base64,${r.data}`}
                          alt="Rendered output"
                          style={{ maxWidth: "100%", borderRadius: 6, marginTop: 10 }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Deploy AI Models */}
        {activeTab === "deploy" && (
          <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <h2 style={{ fontFamily: C.display, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              AI Model &amp; Agent Deployment
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>
              Deploy serverless inference scripts, custom fine-tunes, or agent workflows with instant HTTP endpoints and API keys.
            </p>

            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 20,
                maxWidth: 680,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                  Model / Service Name
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: C.surfaceInput,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: 13,
                    fontFamily: C.mono,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                  Runtime Framework
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: C.surfaceInput,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  <option value="fastapi">FastAPI / Python 3.11 Microservice</option>
                  <option value="langchain">LangChain / LangGraph Agent</option>
                  <option value="vllm">vLLM Inference Container</option>
                  <option value="express">Node.js 20 Microservice</option>
                </select>
              </div>

              <button
                onClick={handleDeployModel}
                disabled={isDeploying}
                style={{
                  padding: "11px 18px",
                  borderRadius: 8,
                  background: C.green,
                  color: "#0B0F0C",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isDeploying ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <Zap size={16} fill="#0B0F0C" />
                <span>{isDeploying ? "Deploying Sandbox Endpoint..." : "Deploy Live Endpoint"}</span>
              </button>
            </div>

            {/* Deployed models list */}
            {deployedModels.length > 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Active Model Endpoints</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {deployedModels.map((m) => (
                    <div
                      key={m.model_id}
                      style={{
                        background: C.surfaceCard,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: C.mono,
                            color: C.greenLight,
                            background: "rgba(109, 184, 74, 0.15)",
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          ACTIVE
                        </span>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: C.textSecondary, fontFamily: C.mono }}>
                        Endpoint: {m.endpoint_url}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: C.textMuted, fontFamily: C.mono }}>
                        API Key: {m.api_key}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Indian Market Pricing (INR) */}
        {activeTab === "pricing" && (
          <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
            <h2 style={{ fontFamily: C.display, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              Cloud Compute Credits &amp; Plans
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 24 }}>
              Calibrated for Indian engineering teams and developers. Pay in INR via UPI, RuPay, and Cards.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontFamily: C.mono, color: C.greenLight }}>FREE TRIAL</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 6 }}>₹0</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>50,000 trial compute tokens</div>
                  <ul style={{ listStyle: "none", fontSize: 12, color: C.textSecondary, marginTop: 16, lineHeight: 2 }}>
                    <li>✓ 50,000 AI tokens</li>
                    <li>✓ Persistent Python 3.11</li>
                    <li>✓ 10 Firecracker microVM runs</li>
                  </ul>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(22, 33, 22, 0.95)",
                  border: `1.5px solid ${C.green}`,
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontFamily: C.mono, color: C.greenLight }}>STARTER</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 6 }}>
                    ₹499 <span style={{ fontSize: 12, color: C.textMuted }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>For solo builders &amp; creators</div>
                  <ul style={{ listStyle: "none", fontSize: 12, color: C.textSecondary, marginTop: 16, lineHeight: 2 }}>
                    <li>✓ 2,000,000 tokens/mo</li>
                    <li>✓ 500 microVM compute runs</li>
                    <li>✓ 3 deployed model endpoints</li>
                  </ul>
                </div>
                <button
                  onClick={() => window.unideploy?.openExternal("https://unideploy.in/pricing")}
                  style={{
                    marginTop: 20,
                    padding: "9px",
                    borderRadius: 6,
                    background: C.green,
                    color: "#0B0F0C",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Upgrade via UPI / RuPay
                </button>
              </div>

              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontFamily: C.mono, color: C.greenLight }}>PRO</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 6 }}>
                    ₹1,499 <span style={{ fontSize: 12, color: C.textMuted }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>For production AI agents</div>
                  <ul style={{ listStyle: "none", fontSize: 12, color: C.textSecondary, marginTop: 16, lineHeight: 2 }}>
                    <li>✓ 10,000,000 tokens/mo</li>
                    <li>✓ Unlimited microVM sandboxes</li>
                    <li>✓ 25 deployed model endpoints</li>
                  </ul>
                </div>
                <button
                  onClick={() => window.unideploy?.openExternal("https://unideploy.in/pricing")}
                  style={{
                    marginTop: 20,
                    padding: "9px",
                    borderRadius: 6,
                    background: C.surfaceCard,
                    color: C.text,
                    border: `1px solid ${C.borderHover}`,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Upgrade via UPI / RuPay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === "settings" && (
          <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
            <h2 style={{ fontFamily: C.display, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              Local Settings &amp; Credentials
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>
              Stored securely on your Mac in <code>~/.unideploy/config.json</code>
            </p>

            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 20,
                maxWidth: 600,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                  UniDeploy Session Token
                </label>
                <input
                  type="text"
                  value={auth.token || ""}
                  placeholder="ud_tok_..."
                  onChange={(e) => setAuth((prev) => ({ ...prev, token: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: C.surfaceInput,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: 13,
                    fontFamily: C.mono,
                    outline: "none",
                  }}
                />
              </div>

              <button
                onClick={() => {
                  if (auth.token && window.unideploy?.setAuth) {
                    window.unideploy.setAuth(auth.token);
                    alert("Authentication token saved!");
                  }
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: C.surfaceCard,
                  border: `1px solid ${C.borderHover}`,
                  color: C.text,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
