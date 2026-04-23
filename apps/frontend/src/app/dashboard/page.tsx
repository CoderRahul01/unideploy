"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Zap, ArrowRight, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { projectsApi, Project } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ProjectCard from "@/components/ui/ProjectCard";
import CreateProject from "@/components/CreateProject";
import DeploymentStatus from "@/components/DeploymentStatus";
import PulseDashboard from "@/components/PulseDashboard";

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createTemplate, setCreateTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("deployments");
  const [activeDeployment, setActiveDeployment] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sysConfig, setSysConfig] = useState({
    read_only: false,
    maintenance: false,
    daily_limit_mins: 60,
  });
  const [systemCost, setSystemCost] = useState<{ total_estimated_usd: number; events: any[] } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const config = await projectsApi.getSystemConfig();
      setSysConfig(config);
    } catch (err) {
      console.error("Failed to fetch system config:", err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: any) {
      console.error("Failed to fetch projects:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) router.push("/");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchConfig();
    fetchProjects();
    const hasTransient = projects.some(
      (p) => p.status === "WAKING" || p.status === "building" || p.status === "deploying",
    );
    const interval = setInterval(
      () => {
        fetchProjects();
        fetchConfig();
      },
      hasTransient ? 5000 : 15000,
    );
    return () => clearInterval(interval);
  }, [fetchProjects, fetchConfig, projects.length, user]);

  useEffect(() => {
    if (activeTab === "settings" && !systemCost) {
      projectsApi.getSystemCost().then(setSystemCost).catch(() => {});
    }
  }, [activeTab, systemCost]);

  useEffect(() => {
    if (searchParams.get("showCreate") === "true") {
      setShowCreate(true);
      const t = searchParams.get("template");
      if (t) setCreateTemplate(t);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00DC82] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans">
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveDeployment(null);
        }}
      />

      <main className="pl-[220px] min-h-screen">
        <header className="h-14 border-b border-[#2A2A2A] flex items-center justify-between px-8 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-40">
          <h1 className="text-sm font-medium text-[#A1A1AA]">
            {activeDeployment
              ? "Overview / Deployment Detail"
              : `Overview / ${activeTab === "deployments" ? "Deployments" : activeTab === "analytics" ? "Analytics" : "Settings"}`}
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            disabled={sysConfig.read_only}
            className="bg-[#00DC82] text-[#0A0A0A] px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#00DC82]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {sysConfig.read_only && (
            <div className="mb-6 p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center gap-3 text-[#F59E0B] text-sm">
              <AlertCircle className="w-4 h-4" />
              Platform is in READ-ONLY mode for maintenance. Mutations are disabled.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center gap-3 text-[#EF4444] text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-auto opacity-60 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === "analytics" ? (
            <PulseDashboard />
          ) : activeTab === "settings" ? (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-base font-semibold text-[#F5F5F5]">Account</h2>
              <div className="rounded-xl bg-[#111111] border border-[#2A2A2A] divide-y divide-[#2A2A2A]">
                <div className="px-5 py-4 flex justify-between items-center">
                  <span className="text-xs text-[#A1A1AA]">Email</span>
                  <span className="text-sm text-[#F5F5F5]">{user.email ?? "—"}</span>
                </div>
                <div className="px-5 py-4 flex justify-between items-center">
                  <span className="text-xs text-[#A1A1AA]">User ID</span>
                  <span className="text-xs font-mono text-[#52525B]">{user.uid}</span>
                </div>
                <div className="px-5 py-4 flex justify-between items-center">
                  <span className="text-xs text-[#A1A1AA]">Plan</span>
                  <span className="text-sm text-[#00DC82] font-semibold">
                    {sysConfig.maintenance ? "Maintenance" : "Active"}
                  </span>
                </div>
                <div className="px-5 py-4 flex justify-between items-center">
                  <span className="text-xs text-[#A1A1AA]">Daily Runtime Limit</span>
                  <span className="text-sm text-[#F5F5F5]">{sysConfig.daily_limit_mins} min</span>
                </div>
              </div>

              <h2 className="text-base font-semibold text-[#F5F5F5]">Usage &amp; Credits</h2>
              <div className="rounded-xl bg-[#111111] border border-[#2A2A2A] divide-y divide-[#2A2A2A]">
                <div className="px-5 py-4 flex justify-between items-center">
                  <span className="text-xs text-[#A1A1AA]">Estimated Spend</span>
                  <span className="text-sm text-[#F5F5F5]">
                    {systemCost ? `$${systemCost.total_estimated_usd.toFixed(4)}` : <Loader2 className="w-3 h-3 animate-spin inline" />}
                  </span>
                </div>
                <div className="px-5 py-4 flex justify-between items-center">
                  <span className="text-xs text-[#A1A1AA]">Billing Events</span>
                  <span className="text-sm text-[#F5F5F5]">
                    {systemCost ? systemCost.events.length : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : activeDeployment ? (
            <div className="space-y-8">
              <button
                onClick={() => setActiveDeployment(null)}
                className="text-xs text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center gap-2 mb-4 group"
              >
                <ArrowRight className="w-3 h-3 rotate-180 transition-transform group-hover:-translate-x-1" />
                Back to Dashboard
              </button>
              <DeploymentStatus deploymentId={activeDeployment} />
            </div>
          ) : activeTab === "deployments" ? (
            <>
              <h2 className="text-base font-semibold mb-5 text-[#F5F5F5]">Deployments</h2>
              {projects.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-[#2A2A2A] rounded-xl">
                  <Zap className="w-8 h-8 mx-auto mb-4 text-[#52525B]" />
                  <p className="text-[#A1A1AA] text-sm">No deployments yet.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#2A2A2A] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] bg-[#111111]">
                        <th className="text-left px-5 py-3 text-xs text-[#52525B] font-medium">Project</th>
                        <th className="text-left px-5 py-3 text-xs text-[#52525B] font-medium">Status</th>
                        <th className="text-left px-5 py-3 text-xs text-[#52525B] font-medium">Last Deployed</th>
                        <th className="text-left px-5 py-3 text-xs text-[#52525B] font-medium">URL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {projects.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => p.latest_deployment_id && setActiveDeployment(p.latest_deployment_id.toString())}
                          className={`bg-[#0A0A0A] hover:bg-[#111111] transition-colors ${p.latest_deployment_id ? "cursor-pointer" : "opacity-50"}`}
                        >
                          <td className="px-5 py-3 font-medium text-[#F5F5F5]">{p.name}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                              p.status === "RUNNING" ? "bg-[#00DC82]/10 text-[#00DC82]" :
                              p.status === "SLEEPING" ? "bg-[#52525B]/20 text-[#52525B]" :
                              "bg-[#F59E0B]/10 text-[#F59E0B]"
                            }`}>
                              {p.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-[#00DC82] animate-pulse" />}
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[#A1A1AA] text-xs">
                            {p.last_deployed ? new Date(p.last_deployed).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-5 py-3">
                            {p.domain ? (
                              <a
                                href={`https://${p.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-[#00DC82] hover:underline"
                              >
                                {p.domain}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-[#52525B]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <StatCard label="Active Sites" value={projects.length.toString()} change={`${projects.filter(p => p.status === "RUNNING").length} running`} />
                <StatCard label="Total Deployments" value={projects.reduce((n, p) => n + (p.latest_deployment_id ? 1 : 0), 0).toString()} change="across all projects" />
                <StatCard label="Sandbox Engine" value="E2B" change="Firecracker microVMs" />
              </div>

              <h2 className="text-base font-semibold mb-5 text-[#F5F5F5]">Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isLocked={isMutating || sysConfig.read_only}
                    onUpdate={fetchProjects}
                    onMutationStart={() => setIsMutating(true)}
                    onMutationEnd={() => setIsMutating(false)}
                    onError={setError}
                    onClick={() => {
                      if (p.latest_deployment_id) {
                        setActiveDeployment(p.latest_deployment_id.toString());
                      }
                    }}
                  />
                ))}

                {/* New Project card */}
                <button
                  onClick={() => setShowCreate(true)}
                  disabled={sysConfig.read_only}
                  className="bg-[#111111] border border-dashed border-[#2A2A2A] rounded-xl p-5 hover:border-[#00DC82]/50 hover:bg-[#111111] transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-10 h-10 rounded-full border border-dashed border-[#2A2A2A] group-hover:border-[#00DC82]/50 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-[#52525B] group-hover:text-[#00DC82] transition-colors" />
                  </div>
                  <span className="text-sm text-[#52525B] group-hover:text-[#A1A1AA] transition-colors">
                    New Project
                  </span>
                </button>

                {projects.length === 0 && (
                  <div className="col-span-full py-16 text-center border border-dashed border-[#2A2A2A] rounded-xl">
                    <Zap className="w-8 h-8 mx-auto mb-4 text-[#52525B]" />
                    <p className="text-[#A1A1AA] text-sm">
                      No projects yet. Deploy your first one!
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateProject
          template={createTemplate}
          onClose={() => {
            setShowCreate(false);
            setCreateTemplate(null);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="p-5 rounded-xl bg-[#111111] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all">
      <p className="text-xs text-[#A1A1AA] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#F5F5F5] mb-1">{value}</p>
      <p className="text-xs text-[#00DC82] font-medium">{change}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#00DC82] animate-spin" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
