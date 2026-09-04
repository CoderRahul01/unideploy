import { contextBridge, ipcRenderer, shell } from "electron";

export interface SandboxRunPayload {
  language: "python" | "js" | "bash";
  code: string;
  timeoutMs?: number;
}

export interface ModelDeployPayload {
  name: string;
  framework: string;
  description?: string;
}

const unideployApi = {
  runSandbox: (payload: SandboxRunPayload) => ipcRenderer.invoke("sandbox:run", payload),
  deployModel: (payload: ModelDeployPayload) => ipcRenderer.invoke("model:deploy", payload),
  invokeModel: (modelId: string, apiKey: string, payload: any) =>
    ipcRenderer.invoke("model:invoke", { modelId, apiKey, payload }),
  getAuth: () => ipcRenderer.invoke("auth:get"),
  setAuth: (token: string, email?: string) => ipcRenderer.invoke("auth:set", { token, email }),
  openExternal: (url: string) => shell.openExternal(url),
};

contextBridge.exposeInMainWorld("unideploy", unideployApi);

export type UniDeployAPI = typeof unideployApi;
