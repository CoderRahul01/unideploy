import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

let mainWindow: BrowserWindow | null = null;

const CONFIG_DIR = path.join(os.homedir(), ".unideploy");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function readStoredConfig(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function writeStoredConfig(updates: Record<string, any>) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const current = readStoredConfig();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...updates }, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write unideploy config:", err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0B0F0C",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle("auth:get", async () => {
  const config = readStoredConfig();
  const token = config.token || config.authToken || null;
  const email = config.email || null;
  const tokensRemaining = config.tokensRemaining ?? 50000;
  return { token, email, tokensRemaining };
});

ipcMain.handle("auth:set", async (_event, payload: { token: string; email?: string }) => {
  writeStoredConfig({
    token: payload.token,
    ...(payload.email ? { email: payload.email } : {}),
  });
  return { success: true };
});

ipcMain.handle("sandbox:run", async (_event, payload: { language: string; code: string; timeoutMs?: number }) => {
  try {
    const config = readStoredConfig();
    const token = config.token || "";

    const res = await fetch("https://www.unideploy.in/api/sandbox/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      stderr: err.message || "Failed to reach UniDeploy sandbox cloud",
    };
  }
});

ipcMain.handle("model:deploy", async (_event, payload: { name: string; framework: string; description?: string }) => {
  try {
    const config = readStoredConfig();
    const token = config.token || "";

    const res = await fetch("https://unideploy-api.rahulpandey-creates.workers.dev/api/v1/models/deploy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to deploy model to cloud gateway",
    };
  }
});

ipcMain.handle("model:invoke", async (_event, { modelId, apiKey, payload }: { modelId: string; apiKey: string; payload: any }) => {
  try {
    const res = await fetch(`https://unideploy-api.rahulpandey-creates.workers.dev/api/v1/models/${modelId}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to invoke model endpoint",
    };
  }
});
