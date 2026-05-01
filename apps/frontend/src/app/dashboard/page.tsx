"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UniDeploySocket, WSMessage, Finding, ScanSummary } from "@/lib/websocket";

const dash = {
  bg: "#0F1410",
  surface: "#161D16",
  border: "#2A3A2A",
  text: "#E8F0D8",
  muted: "#6A7A5A",
  green: "#6DB84A",
  red: "#FF6B6B",
  amber: "#F0A830",
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const urlMachine = searchParams.get("machine");

  const [machineName, setMachineName] = useState<string | null>(urlMachine);
  const [status, setStatus] = useState<"waiting" | "connected" | "scanning" | "complete">("waiting");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [socket, setSocket] = useState<UniDeploySocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const ws = new UniDeploySocket(
      sessionId,
      (msg: WSMessage) => {
        if (msg.type === "browser_connected") {
          setStatus("connected");
        } else if (msg.type === "cli_ready") {
          setStatus("scanning");
          if (msg.machine_name) setMachineName(msg.machine_name);
        } else if (msg.type === "finding") {
          setFindings((prev) => [...prev, msg.finding]);
        } else if (msg.type === "scan_complete") {
          setStatus("complete");
          setSummary(msg.summary);
        }
      },
      () => console.log("WS connected"),
      () => console.log("WS disconnected")
    );

    ws.connect();
    setSocket(ws);

    return () => ws.disconnect();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div style={{ color: dash.text, padding: 40, background: dash.bg, minHeight: "100vh" }}>
        No session ID provided. Please run <code style={{ color: dash.green }}>npx unideploy init</code> in your terminal.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: dash.bg, color: dash.text, padding: 40, fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
      <h1 style={{ fontFamily: "var(--font-display), Sora, sans-serif", marginBottom: 20 }}>
        Session: {machineName || "Unknown Machine"}
      </h1>
      
      <div style={{ marginBottom: 20 }}>
        <strong>Status: </strong>
        <span style={{ color: dash.green, fontWeight: "bold" }}>
          {status === 'waiting' ? 'WAITING FOR BROWSER...' : status.toUpperCase()}
        </span>
      </div>

      {findings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display), Sora, sans-serif" }}>Findings ({findings.length})</h2>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {findings.map((f, i) => (
              <li key={i} style={{ background: dash.surface, border: `1px solid ${dash.border}`, padding: 15, marginBottom: 10, borderRadius: 8 }}>
                <div style={{ color: f.severity === 'CRITICAL' ? dash.red : dash.amber, fontWeight: "bold", marginBottom: 4 }}>
                  [{f.severity}] {f.title}
                </div>
                <div style={{ color: dash.muted, fontSize: 14, fontFamily: "var(--font-mono), JetBrains Mono, monospace" }}>
                  {f.file}:{f.line}
                </div>
                <div style={{ marginTop: 8 }}>{f.description}</div>
                {f.auto_fixable && (
                  <button 
                    onClick={() => socket?.sendApplyFix(f.id)}
                    style={{ background: dash.green, color: dash.bg, border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", marginTop: 12, fontWeight: "bold" }}
                  >
                    Apply Fix
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div style={{ background: dash.surface, padding: 20, border: `1px solid ${dash.border}`, borderRadius: 8 }}>
          <h2 style={{ fontFamily: "var(--font-display), Sora, sans-serif" }}>Scan Complete</h2>
          <p>Security Grade: <strong style={{ fontSize: 24, color: dash.green }}>{summary.grade}</strong></p>
          <p>Total Findings: {summary.total}</p>
          <p>Auto-fixable: {summary.auto_fixable}</p>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ color: dash.text, padding: 40, background: dash.bg, minHeight: "100vh" }}>Loading session...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
