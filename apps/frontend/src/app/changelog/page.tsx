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
    version: "v0.1.0",
    date: "May 2026",
    changes: [
      "CLI published to npm — `npm install -g unideploy`",
      "13-rule security scanner live (RLS, secrets, auth logic, headers, BOLA)",
      "GitHub URL scan flow — submit any public or private repo URL",
      "WebSocket CLI session pairing via `unideploy init`",
      "Gemini-powered remediation plans per finding",
      "Auto-fix PR creation via GitHub integration (Builder plan and above)",
      "Dashboard live at unideploy.vercel.app",
      "GitHub Actions CI integration — gates merges on CRITICAL findings",
      "MCP tools for IDE-level scan access",
      "Agent Engine deployed on Vertex AI (Orchestrator → Analyzer + AutoFix)",
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
