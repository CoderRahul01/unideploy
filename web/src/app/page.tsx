"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Rocket,
  Globe,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { loginWithGoogle, loginWithGithub, logout, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import CreateProject from "@/components/CreateProject";
import DeploymentStatus from "@/components/DeploymentStatus";
import PulseDashboard from "@/components/PulseDashboard";
import { projectsApi, Project } from "@/lib/api";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"deployments" | "analytics">("deployments");
  const [activeDeployment, setActiveDeployment] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sysConfig, setSysConfig] = useState({
    read_only: false,
    maintenance: false,
    daily_limit_mins: 60,
  });

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
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchConfig();
    fetchProjects();
    const hasTransient = projects.some(
      (p) => p.status === "WAKING" || p.status === "CREATED",
    );
    const interval = setInterval(
      () => {
        fetchProjects();
        fetchConfig();
      },
      hasTransient ? 3000 : 8000,
    );
    return () => clearInterval(interval);
  }, [fetchProjects, fetchConfig, projects.length, user]);

  const handleCreateSuccess = () => {
    setShowCreate(false);
    fetchProjects();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent">
        <div className="w-20 h-20 mb-8 aspect-square relative">
          <div className="absolute inset-0 bg-purple-500/20 blur-3xl animate-pulse" />
          <img
            src="/logo.png"
            alt="Logo"
            className="w-full h-full object-contain relative z-10"
          />
        </div>
        <h1 className="text-4xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">
          UNI-DEPLOY
        </h1>
        <p className="text-white/40 text-sm mb-12 max-w-sm text-center leading-relaxed">
          The invisible orchestration layer for modern web apps. Sign in to
          start deploying.
        </p>
        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={loginWithGithub}
            className="w-full flex items-center justify-center gap-3 bg-[#24292e] text-white py-3 rounded-xl font-bold text-sm border border-white/5 hover:bg-[#2b3137] transition-all"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/github.svg"
              className="w-4 h-4 invert"
            />
            Continue with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl p-6 z-50">
        <div
          className="flex items-center gap-3 mb-10 px-2 cursor-pointer"
          onClick={() => setActiveDeployment(null)}
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="UniDeploy Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight">UniDeploy</span>
        </div>

        <nav className="space-y-1">
          <NavItem
            icon={<Globe className="w-4 h-4" />}
            label="Deployments"
            active={activeTab === "deployments"}
            onClick={() => {
              setActiveTab("deployments");
              setActiveDeployment(null);
            }}
          />
          <NavItem
            icon={<BarChart3 className="w-4 h-4" />}
            label="Analytics"
            active={activeTab === "analytics"}
            onClick={() => setActiveTab("analytics")}
          />
          <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" />
        </nav>

        <div className="absolute bottom-8 left-6 right-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/5 mb-6">
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">
              Free Tier
            </p>
            <p className="text-xs text-white/60 leading-relaxed">
              Apps auto-sleep after 15m of inactivity.{" "}
              <span className="text-purple-400">60m daily limit</span> per app.
            </p>
          </div>
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-xs">
              {user?.displayName?.[0] || user?.email?.[0] || "?"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium truncate">
                {user?.displayName || "Developer"}
              </p>
              <p className="text-[10px] text-white/40 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64 min-h-screen">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-black/20 backdrop-blur-md z-40">
          <h1 className="text-sm font-medium text-white/60">
            Overview / {activeDeployment ? "Deployment Detail" : activeTab === "deployments" ? "Deployments" : "Analytics"}
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            disabled={sysConfig.read_only}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {sysConfig.read_only && (
            <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3 text-yellow-500 text-sm animate-pulse">
              <AlertCircle className="w-4 h-4" />
              Platform is in READ-ONLY mode for maintenance. Mutations are
              disabled.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm animate-in fade-in slide-in-from-top-2">
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
          ) : activeDeployment ? (
            <div className="space-y-8">
              <button
                onClick={() => setActiveDeployment(null)}
                className="text-xs text-white/40 hover:text-white flex items-center gap-2 mb-4 group"
              >
                <ArrowRight className="w-3 h-3 rotate-180 transition-transform group-hover:-translate-x-1" />
                Back to Dashboard
              </button>
              <DeploymentStatus deploymentId={activeDeployment} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <StatCard
                  label="Active Sites"
                  value={projects.length.toString()}
                  change="+2 this month"
                />
                <StatCard label="Build Time" value="1m 32s" change="-12s avg" />
                <StatCard label="Bandwidth" value="4.2 GB" change="82% used" />
              </div>

              <h2 className="text-xl font-semibold mb-6">Recent Deployments</h2>
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} onClick={() => setActiveDeployment(p.id.toString())} className="cursor-pointer">
                    <DeploymentItem
                      project={p}
                      isGlobalLocked={isMutating || sysConfig.read_only}
                      onUpdate={fetchProjects}
                      onMutationStart={() => setIsMutating(true)}
                      onMutationEnd={() => setIsMutating(false)}
                      onError={setError}
                    />
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                    <Zap className="w-8 h-8 mx-auto mb-4 opacity-10" />
                    <p className="text-white/40 text-sm">
                      No projects yet. Deploy your first one!
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {showCreate && <CreateProject onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
        ? "bg-white/10 text-white shadow-sm"
        : "text-white/50 hover:text-white hover:bg-white/5"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
      <p className="text-sm text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-bold mb-2">{value}</p>
      <p className="text-xs text-green-500 font-medium">{change}</p>
    </div>
  );
}

function DeploymentItem({
  project,
  isGlobalLocked,
  onUpdate,
  onMutationStart,
  onMutationEnd,
  onError,
}: {
  project: Project;
  isGlobalLocked: boolean;
  onUpdate: () => void;
  onMutationStart: () => void;
  onMutationEnd: () => void;
  onError: (msg: string | null) => void;
}) {
  const [localLoading, setLocalLoading] = useState(false);
  const { id, name, status, daily_runtime_minutes, domain } = project;

  // Frontend Invariants (Sanity Checks)
  useEffect(() => {
    // Invariant: A running app must eventually have a domain
    if (status === "RUNNING" && !domain) {
      console.warn(
        `[Invariant Violation] Project ${name} is RUNNING but has no domain.`,
      );
    }
  }, [status, domain, name]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGlobalLocked || localLoading) return;

    setLocalLoading(true);
    onMutationStart();
    onError(null);

    try {
      if (status === "RUNNING") {
        await projectsApi.stop(id);
      } else {
        await projectsApi.start(id);
      }
      // Re-fetch reality from backend IMMEDIATELY after success
      await onUpdate();
    } catch (err: any) {
      onError(err.message || "Action failed");
    } finally {
      setLocalLoading(false);
      onMutationEnd();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "RUNNING":
        return "bg-green-500";
      case "WAKING":
        return "bg-yellow-400";
      case "SLEEPING":
        return "bg-blue-400";
      case "BUILT":
        return "bg-yellow-500";
      case "CREATED":
        return "bg-gray-500";
      default:
        return "bg-white/20";
    }
  };

  const getIconColor = () => {
    switch (status) {
      case "RUNNING":
        return "bg-green-500/10 text-green-500";
      case "WAKING":
        return "bg-yellow-500/10 text-yellow-400 animate-pulse";
      case "SLEEPING":
        return "bg-blue-500/10 text-blue-400";
      case "BUILT":
        return "bg-yellow-500/10 text-yellow-500 text-opacity-40";
      default:
        return "bg-white/5 text-white/40";
    }
  };

  // State Machine Rule: Only show buttons if transition is allowed
  const canWake = status === "SLEEPING" || status === "BUILT";
  const canStop = status === "RUNNING";
  const isTransitioning = status === "WAKING";

  // Frontend Invariants (Sanity Checks)
  const isBroken = status === "RUNNING" && !domain;
  const isOverQuota = daily_runtime_minutes >= 60;

  return (
    <div
      className={`p-5 rounded-xl bg-white/[0.02] border flex items-center justify-between hover:bg-white/[0.04] transition-all group cursor-default ${isOverQuota ? "border-red-500/20" : "border-white/5"
        }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor()}`}
        >
          {isTransitioning || isBroken ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Rocket className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold group-hover:text-purple-400 transition-colors uppercase tracking-tight text-sm">
              {name}
            </h3>
            {isOverQuota && (
              <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full font-black tracking-widest uppercase">
                Limit Hit
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/40">
            {isBroken
              ? "Allocating Networking..."
              : domain || "Provisioning..."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right min-w-[120px]">
          <div className="flex items-center gap-2 justify-end mb-1">
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {isBroken ? "WAKING" : status}
            </span>
          </div>
          {(status === "RUNNING" || status === "WAKING") && (
            <div className="flex flex-col items-end gap-1 mt-1">
              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${isOverQuota ? "bg-red-500" : "bg-purple-500"}`}
                  style={{
                    width: `${Math.min(100, (daily_runtime_minutes / 60) * 100)}%`,
                  }}
                />
              </div>
              <p
                className={`text-[8px] uppercase font-bold tracking-tighter ${isOverQuota ? "text-red-500" : "text-white/30"}`}
              >
                {daily_runtime_minutes} / 60 mins
              </p>
            </div>
          )}
        </div>

        {(canWake || canStop || isTransitioning) && (
          <button
            onClick={handleToggle}
            disabled={isGlobalLocked || localLoading || isTransitioning}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all min-w-[80px] flex items-center justify-center ${canStop
              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
              : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {localLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : canStop ? (
              "Stop"
            ) : (
              "Wake"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
