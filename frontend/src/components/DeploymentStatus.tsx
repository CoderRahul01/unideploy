"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Terminal, Activity, Zap, Globe } from "lucide-react";
import { projectsApi } from "@/lib/api";

export default function DeploymentStatus({ deploymentId }: { deploymentId: string }) {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "localhost:8000";
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProtocol}//${API_URL.replace('http://', '').replace('https://', '')}/ws/deploy/${deploymentId}`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setStatus(data);
            if (data.status === 'live' || data.status === 'failed') {
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
                if (data.status === 'live' || data.status === 'failed') {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Initial fetch error:", err);
            }
        }
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
                    <span className={`w-2 h-2 rounded-full ${status.status === 'live' ? 'bg-green-500' : status.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                        }`} />
                    <span className="text-xs font-mono uppercase opacity-60 tracking-tighter">{status.status}</span>
                </div>
            </div>

            <div className="p-8">
                <div className="space-y-6">
                    <StatusStep
                        label="Initialization"
                        desc="Cloning repository and preparing environment"
                        active={status.status !== 'queued'}
                        done={['building', 'deploying', 'live', 'failed'].includes(status.status)}
                    />
                    <StatusStep
                        label="Build Process"
                        desc="Detecting framework and creating Docker image"
                        active={status.status === 'building'}
                        done={['deploying', 'live', 'failed'].includes(status.status) && status.status !== 'failed'}
                        failed={status.status === 'failed' && !status.deploy_manifests}
                    />
                    <StatusStep
                        label="Cloud Deployment"
                        desc="Allocating clusters and configuring networking"
                        active={status.status === 'deploying'}
                        done={status.status === 'live'}
                        failed={status.status === 'failed' && status.building_complete}
                    />
                </div>

                {status.status === 'live' && (
                    <div className="mt-10 p-5 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <p className="text-[10px] text-green-500/60 uppercase font-black tracking-[0.2em] mb-1">Production URL</p>
                            <a href={`http://${status.domain}`} target="_blank" className="text-sm font-semibold text-green-400 hover:underline flex items-center gap-2">
                                <Globe className="w-3 h-3" />
                                {status.domain}
                            </a>
                        </div>
                        <div className="bg-green-500 text-black p-2 rounded-lg shadow-lg shadow-green-500/20">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                )}

                {status.status === 'failed' && (
                    <div className="mt-10 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400 font-medium flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Error: {status.error || "An unknown error occurred during deployment."}
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-black/40 p-4 border-t border-white/5 flex items-center gap-3">
                <Terminal className="w-4 h-4 text-white/30" />
                <p className="text-[10px] font-mono text-white/40 truncate">
                    {status.status === 'live' ? 'Build successful. Container is healthy.' : 'Waiting for build artifacts...'}
                </p>
            </div>
        </div>
    );
}

function StatusStep({ label, desc, active, done, failed }: { label: string, desc: string, active: boolean, done: boolean, failed?: boolean }) {
    return (
        <div className={`flex gap-4 transition-all duration-500 ${!active && !done && !failed ? 'opacity-30' : 'opacity-100'}`}>
            <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 transition-all ${done ? 'bg-green-500 border-green-500 text-black' :
                    failed ? 'bg-red-500 border-red-500 text-white' :
                        active ? 'border-purple-500 text-purple-500' : 'border-white/10 text-white/20'
                    }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : failed ? <XCircle className="w-4 h-4" /> : active ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                </div>
                <div className="w-0.5 h-10 bg-white/5 my-1 rounded-full" />
            </div>
            <div>
                <h4 className={`text-sm font-bold ${active ? 'text-white' : 'text-white/60'}`}>{label}</h4>
                <p className="text-xs text-white/40 leading-relaxed mt-0.5">{desc}</p>
            </div>
        </div>
    );
}
