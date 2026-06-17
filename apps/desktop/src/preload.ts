import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("uni", {
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (data: Record<string, string>) => ipcRenderer.invoke("settings:set", data),
  },
  agent: {
    prompt: (opts: { prompt: string; cwd?: string }) =>
      ipcRenderer.invoke("agent:prompt", opts),
    onChunk: (cb: (text: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, text: string) => cb(text);
      ipcRenderer.on("agent:chunk", handler);
      return () => ipcRenderer.removeListener("agent:chunk", handler);
    },
    onTool: (cb: (text: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, text: string) => cb(text);
      ipcRenderer.on("agent:tool", handler);
      return () => ipcRenderer.removeListener("agent:tool", handler);
    },
    onDone: (cb: (result: { code: number | null; error?: string }) => void) => {
      const handler = (
        _: Electron.IpcRendererEvent,
        result: { code: number | null; error?: string }
      ) => cb(result);
      ipcRenderer.on("agent:done", handler);
      return () => ipcRenderer.removeListener("agent:done", handler);
    },
  },
  scan: {
    run: (opts: { repoPath: string; type?: string }) =>
      ipcRenderer.invoke("scan:run", opts),
  },
});
