#!/usr/bin/env node

import { Command } from "commander";
import WebSocket from "ws";
import os from "os";

const API_URL = process.env.UNIDEPLOY_API_URL || "http://localhost:8000";
const WS_URL = process.env.UNIDEPLOY_WS_URL || "ws://localhost:8000";

const program = new Command();

program
  .name("unideploy")
  .description("Production-readiness scanner for vibe-coded apps")
  .version("0.1.0");

program
  .command("init")
  .description("Start a secure pairing session with the dashboard")
  .action(async () => {
    console.log("🚀 Initializing UniDeploy session...");

    try {
      const res = await fetch(`${API_URL}/api/v1/sessions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cli_version: "0.1.0",
          machine_name: os.hostname(),
          project_path: process.cwd(),
        }),
      });

      if (!res.ok) {
        console.error("❌ Failed to create session:", await res.text());
        process.exit(1);
      }

      const data = await res.json();
      
      console.log("\n=========================================");
      console.log(`📡 Session Code: \x1b[32m${data.session_code}\x1b[0m`);
      console.log(`🌐 Go to: https://unideploy.in/connect`);
      console.log("=========================================\n");
      console.log("Waiting for browser connection...");

      const ws = new WebSocket(data.websocket_url);

      ws.on("open", () => {
        // Connected to relay, but waiting for browser
      });

      ws.on("message", (rawMsg) => {
        const msg = JSON.parse(rawMsg.toString());

        if (msg.type === "browser_connected") {
          console.log("✅ Browser connected! Starting scan...");
          
          // Send manifest to start scan
          ws.send(JSON.stringify({
            type: "cli_ready",
            machine_name: os.hostname(),
            project_manifest: {
              framework: "unknown",
              files: []
            }
          }));

          // Mock finding after 2s
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: "finding",
              finding: {
                id: "finding-001",
                severity: "HIGH",
                category: "security",
                title: "Exposed API Key",
                file: ".env",
                line: 1,
                description: "Found hardcoded API key in source",
                auto_fixable: true
              }
            }));
          }, 2000);

          // Mock complete after 4s
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: "scan_complete",
              summary: {
                grade: "C",
                total: 1,
                auto_fixable: 1,
                critical: 0,
                high: 1,
                medium: 0,
                low: 0
              }
            }));
            console.log("🏁 Scan complete!");
          }, 4000);
        } else if (msg.type === "apply_fix") {
          console.log(`🛠️  Received request to fix: ${msg.finding_id}`);
          // Mock fix application
          setTimeout(() => {
            console.log("✅ Fix applied!");
            ws.send(JSON.stringify({
              type: "fix_applied",
              finding_id: msg.finding_id,
              diff: "+ Fixed line"
            }));
          }, 1000);
        }
      });

      ws.on("close", () => {
        console.log("Session disconnected.");
        process.exit(0);
      });

    } catch (err) {
      console.error("❌ Error:", err);
      process.exit(1);
    }
  });

program.parse();
