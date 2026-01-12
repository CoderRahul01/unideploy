import axios from "axios";
import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add Firebase token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for clear error mapping
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "An unexpected error occurred";
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = error.response.data.detail || "Bad Request";
          break;
        case 403:
          message =
            "Quota reached: " +
            (error.response.data.detail || "Daily runtime exceeded");
          break;
        case 409:
          message = "Action in progress. Please wait.";
          break;
        case 429:
          message = "Too many requests. Slow down.";
          break;
        case 503:
          message = "Platform capacity reached. Try again later.";
          break;
        default:
          message = error.response.data.detail || "Server error";
      }
    }
    return Promise.reject({ ...error, message });
  },
);

export interface Project {
  id: number;
  name: string;
  status: "CREATED" | "BUILT" | "WAKING" | "RUNNING" | "SLEEPING";
  last_active_at: string;
  daily_runtime_minutes: number;
  total_runtime_minutes: number;
  last_deployed: string;
  domain?: string;
}

export const projectsApi = {
  list: () => api.get<Project[]>("/projects").then((res) => res.data),
  create: (
    name: string,
    type: string = "unknown",
    port: number = 80,
    tier: string = "SEED",
    env_vars: Record<string, string> = {}
  ) =>
    api
      .post<Project>("/projects", { name, project_type: type, port, tier, env_vars })
      .then((res) => res.data),
  start: (id: number) =>
    api.post(`/projects/${id}/start`).then((res) => res.data),
  stop: (id: number) =>
    api.post(`/projects/${id}/stop`).then((res) => res.data),
  getHealth: () => api.get("/health").then((res) => res.data),
  getMetrics: () => api.get("/metrics").then((res) => res.data),
  getDeployment: (id: string) => api.get(`/deployments/${id}`).then((res) => res.data),
  deploy: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<{
        deployment_id: number;
        status: string;
      }>(`/deploy/${id}`, formData)
      .then((res) => res.data);
  },
  deployFromGit: (id: number, repoUrl: string) =>
    api.post(`/deploy/${id}/git`, { repo_url: repoUrl }).then((res) => res.data),
  analyze: (repoUrl: string) =>
    api.post("/analyze", null, { params: { repo_url: repoUrl } }).then((res) => res.data),
  getGithubRepos: async (token: string) => {
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch repositories");
    return response.json();
  },
  analyzeZip: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/analyze/zip", formData).then((res) => res.data);
  },
  getSystemConfig: () =>
    api
      .get<{
        read_only: boolean;
        maintenance: boolean;
        daily_limit_mins: number;
      }>("/system/config")
      .then((res) => res.data),
  applyFix: (deploymentId: string) =>
    api.post(`/deployments/${deploymentId}/apply-fix`).then((res) => res.data),
};

export default api;
