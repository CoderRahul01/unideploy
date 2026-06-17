import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "path";
import * as cp from "child_process";
import * as fs from "fs";

type Settings = {
  ANTHROPIC_API_KEY: string;
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  TINYFISH_API_KEY: string;
};

const DEFAULTS: Settings = {
  ANTHROPIC_API_KEY: "",
  GEMINI_API_KEY: "",
  GROQ_API_KEY: "",
  TINYFISH_API_KEY: "",
};

function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf-8");
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeSettings(data: Partial<Settings>): void {
  const current = readSettings();
  const merged = { ...current, ...data };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2));
}

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#F5F0E8",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    void win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  applyStoredEnv();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(console.error);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function applyStoredEnv(): void {
  const settings = readSettings();
  for (const [key, val] of Object.entries(settings)) {
    if (val) process.env[key] = val;
  }
}

// ── IPC: settings ─────────────────────────────────────────────────────────────

ipcMain.handle("settings:get", () => readSettings());

ipcMain.handle("settings:set", (_event, data: Partial<Settings>) => {
  writeSettings(data);
  for (const [key, val] of Object.entries(data)) {
    if (val) process.env[key] = val;
  }
  return { ok: true };
});

// ── IPC: agent (spawns CLI as subprocess, streams output) ─────────────────────

ipcMain.handle(
  "agent:prompt",
  (event, { prompt, cwd }: { prompt: string; cwd?: string }) =>
    new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const cliPath = app.isPackaged
        ? path.join(process.resourcesPath, "cli", "src", "cli.ts")
        : path.join(__dirname, "../../../packages/cli/src/cli.ts");

      const child = cp.spawn("npx", ["tsx", cliPath, prompt], {
        cwd: cwd ?? app.getPath("home"),
        env: { ...process.env },
        shell: false,
      });

      child.stdout.on("data", (chunk: Buffer) => {
        event.sender.send("agent:chunk", chunk.toString());
      });
      child.stderr.on("data", (chunk: Buffer) => {
        event.sender.send("agent:tool", chunk.toString());
      });
      child.on("close", (code) => {
        event.sender.send("agent:done", { code });
        resolve({ ok: code === 0 });
      });
      child.on("error", (err: Error) => {
        event.sender.send("agent:done", { code: 1, error: err.message });
        resolve({ ok: false, error: err.message });
      });
    })
);

// ── IPC: scan ─────────────────────────────────────────────────────────────────

ipcMain.handle(
  "scan:run",
  (event, { repoPath, type }: { repoPath: string; type?: string }) => {
    const scanPrompt =
      type === "secrets" ? "scan for secrets only"
      : type === "rls"   ? "check RLS"
      : type === "deploy" ? "check deploy readiness"
      : "scan this project";

    event.sender.send("agent:chunk", `Scanning ${repoPath}...\n`);

    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const cliPath = app.isPackaged
        ? path.join(process.resourcesPath, "cli", "src", "cli.ts")
        : path.join(__dirname, "../../../packages/cli/src/cli.ts");

      const child = cp.spawn("npx", ["tsx", cliPath, scanPrompt], {
        cwd: repoPath,
        env: { ...process.env },
        shell: false,
      });

      child.stdout.on("data", (chunk: Buffer) => {
        event.sender.send("agent:chunk", chunk.toString());
      });
      child.stderr.on("data", (chunk: Buffer) => {
        event.sender.send("agent:tool", chunk.toString());
      });
      child.on("close", (code) => {
        event.sender.send("agent:done", { code });
        resolve({ ok: code === 0 });
      });
      child.on("error", (err: Error) => {
        resolve({ ok: false, error: err.message });
      });
    });
  }
);
