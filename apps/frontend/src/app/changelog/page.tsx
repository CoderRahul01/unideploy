import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — UniDeploy",
};

type Entry = {
  version: string;
  date: string;
  changes: string[];
};

const ENTRIES: Entry[] = [
  {
    version: "v0.2.0",
    date: "September 2026",
    changes: [
      "AI Cloud Sandboxes live — sub-2s isolated microVMs with Python 3.13, NumPy, Pandas & Matplotlib",
      "Native macOS Desktop application (.dmg) for Apple Silicon (arm64) and Intel (x64)",
      "Instant 1-click Python script to live HTTPS endpoint deployment with dedicated API keys",
      "Dodo Payments billing integration supporting UPI, RuPay, and international cards",
      "Model Context Protocol (MCP) server for Cursor, Claude Desktop, and autonomous agents",
      "Interactive Web Sandbox with real-time base64 visualisations and console streaming",
      "Device pairing via `unideploy auth` and 6-digit session codes on Cloudflare KV edge",
    ],
  },
  {
    version: "v0.1.0",
    date: "May 2026",
    changes: [
      "CLI published to npm — `npm install -g unideploy`",
      "Initial edge gateway deployment on Cloudflare Workers and D1 database",
      "Device pairing via `unideploy auth`",
      "MCP tools for IDE-level code execution",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f1410",
        padding: "64px 24px",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            fontSize: 11,
            color: "#1D9E75",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Release history
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#e8f0d8",
            lineHeight: 1.25,
            marginBottom: 48,
          }}
        >
          Changelog
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {ENTRIES.map((entry) => (
            <div key={entry.version}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    background: "rgba(29,158,117,0.1)",
                    border: "0.5px solid rgba(29,158,117,0.3)",
                    color: "#1D9E75",
                    borderRadius: 4,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontFamily: "var(--font-mono), JetBrains Mono, monospace",
                    fontWeight: 500,
                  }}
                >
                  {entry.version}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "#3a4a2a",
                    fontFamily: "var(--font-mono), JetBrains Mono, monospace",
                  }}
                >
                  {entry.date}
                </span>
              </div>

              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  paddingLeft: 4,
                  borderLeft: "0.5px solid rgba(29,158,117,0.2)",
                }}
              >
                {entry.changes.map((change) => (
                  <li
                    key={change}
                    style={{
                      fontSize: 14,
                      color: "#6a7a5a",
                      lineHeight: 1.6,
                      paddingLeft: 16,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: -3,
                        top: 9,
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#1D9E75",
                        opacity: 0.5,
                      }}
                    />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 64,
            fontSize: 12,
            color: "#2a3a2a",
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
          }}
        >
          More releases coming soon.
        </p>
      </div>
    </main>
  );
}
