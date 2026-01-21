"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Globe,
  Sparkles,
} from "lucide-react";
import { projectsApi } from "@/lib/api";
import Terminal from "./Terminal";

export default function DeploymentStatus({
  deploymentId,
}: {
  deploymentId: string;
}) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "localhost:8000";
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${wsProtocol}//${API_URL.replace("http://", "").replace("https://", "")}/ws/deploy/${deploymentId}`,
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data);
      if (data.status === "live" || data.status === "failed") {
        setLoading(false);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    const fetchInitial = async () => {
      try {
        const data = await projectsApi.getDeployment(deploymentId);
        setStatus(data);
        if (data.status === "live" || data.status === "failed") {
          setLoading(false);
        }
      } catch (err) {
        console.error("Initial fetch error:", err);
      }
    };
    fetchInitial();

    return () => ws.close();
  }, [deploymentId]);

  if (!status) return null;

  return (
    <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-w-2xl w-full mx-auto">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold">Deployment Status</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${status.status === "live"
              ? "bg-green-500"
              : status.status === "failed"
                ? "bg-red-500"
                : "bg-yellow-500 animate-pulse"
              }`}
          />
          <span className="text-xs font-mono uppercase opacity-60 tracking-tighter">
            {status.status}
          </span>
        </div>
      </div>

      <div className="p-8">
        <div className="space-y-6">
          <StatusStep
            label="Initialization"
            desc="Cloning repository and preparing environment"
            active={status.status !== "queued"}
            done={["building", "deploying", "live", "failed"].includes(
              status.status,
            )}
          />
          <StatusStep
            label="Build Process"
            desc="Detecting framework and creating Docker image"
            active={status.status === "building"}
            done={
              ["deploying", "live", "failed"].includes(status.status) &&
              status.status !== "failed"
            }
            failed={status.status === "failed" && !status.deploy_manifests}
          />
          <StatusStep
            label="Cloud Deployment"
            desc="Allocating clusters and configuring networking"
            active={status.status === "deploying"}
            done={status.status === "live"}
            failed={status.status === "failed" && status.building_complete}
          />
        </div>

        {status.status === "live" && (
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Simple CSS Confetti Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-ping opacity-20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${Math.random() * 10 + 5}px`,
                    height: `${Math.random() * 10 + 5}px`,
                    backgroundColor: ['#22c55e', '#a855f7', '#3b82f6', '#eab308'][i % 4],
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 3}s`,
                    borderRadius: i % 2 === 0 ? '50%' : '2px',
                    transform: `rotate(${Math.random() * 360}deg)`
                  }}
                />
              ))}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 shadow-[0_0_50px_-12px_rgba(34,197,94,0.2)]">
              {/* Grainy Noise Overlay */}
              <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />

              <div className="relative p-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                  <div className="relative w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/40 rotate-3 transition-transform hover:rotate-0 z-20">
                    <Zap className="w-10 h-10 text-black" fill="currentColor" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-lg animate-bounce delay-150 z-30">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>

                <h3 className="text-3xl font-black text-white mb-3 tracking-tighter sm:text-4xl">
                  Deployment Success!
                </h3>
                <p className="text-green-200/50 mb-10 max-w-sm text-sm font-medium leading-relaxed">
                  Your project is live and ready for the world. We've automatically provisioned your production domain.
                </p>

                <a
                  href={`http://${status.domain}`}
                  target="_blank"
                  className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-black font-black rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-xl z-20"
                >
                  <Globe className="w-5 h-5 group-hover:animate-spin" />
                  Visit Website
                  <span className="opacity-40 group-hover:translate-x-1 transition-transform">→</span>
                </a>

                <div className="mt-10 pt-10 border-t border-white/5 w-full flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Production Endpoint</p>
                  <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-green-500/80">{status.domain}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {status.status === "failed" && (
          <div className="mt-10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Error:{" "}
                {status.error || "An unknown error occurred during deployment."}
              </p>
            </div>

            {status.autofix && (
              <div className="p-6 rounded-2xl bg-[#1a0a2e]/40 border border-purple-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-12 h-12 text-purple-500" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-100 uppercase tracking-widest">Magic Fix Suggestion</h3>
                    <p className="text-[10px] text-purple-300/40 font-medium">Context retrieved from Dual Memory</p>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[11px] text-white/80 leading-relaxed whitespace-pre-wrap">
                  {status.autofix.suggestion}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {status.autofix.context_retrieved && (
                    <span className="text-[9px] text-green-400/60 font-black uppercase tracking-widest flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Enhanced by Project History
                    </span>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(status.autofix.suggestion)}
                      className="text-[10px] bg-white/5 border border-white/10 text-white/60 px-3 py-1.5 rounded-lg font-bold hover:bg-white/10 transition-all uppercase tracking-widest"
                    >
                      Copy Fix
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await projectsApi.applyFix(deploymentId);
                          // The pipeline will broadcast updates via WS
                        } catch (err: any) {
                          alert(err.message || "Failed to apply fix");
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="text-[10px] bg-purple-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-purple-600 transition-all uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Apply & Redeploy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/5 bg-black/20 p-4">
        <Terminal deploymentId={deploymentId} />
      </div>
    </div>
  );
}

function StatusStep({
  label,
  desc,
  active,
  done,
  failed,
}: {
  label: string;
  desc: string;
  active: boolean;
  done: boolean;
  failed?: boolean;
}) {
  return (
    <div
      className={`flex gap-4 transition-all duration-500 ${!active && !done && !failed ? "opacity-30" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 transition-all ${done
            ? "bg-green-500 border-green-500 text-black"
            : failed
              ? "bg-red-500 border-red-500 text-white"
              : active
                ? "border-purple-500 text-purple-500"
                : "border-white/10 text-white/20"
            }`}
        >
          {done ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : failed ? (
            <XCircle className="w-4 h-4" />
          ) : active ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : null}
        </div>
        <div className="w-0.5 h-10 bg-white/5 my-1 rounded-full" />
      </div>
      <div>
        <h4
          className={`text-sm font-bold ${active ? "text-white" : "text-white/60"}`}
        >
          {label}
        </h4>
        <p className="text-xs text-white/40 leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
