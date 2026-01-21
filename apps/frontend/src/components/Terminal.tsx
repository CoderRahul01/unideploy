"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Terminal as TerminalIcon } from "lucide-react";

interface TerminalProps {
    deploymentId: string;
}

export default function Terminal({ deploymentId }: TerminalProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 1. Connect to Gateway (Socket.io)
        // In PROD, use env var. In DEV, assume localhost:3001
        const GATEWAY_URL =
            process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3001";

        console.log(`[Terminal] Connecting to ${GATEWAY_URL}...`);

        const socket = io(GATEWAY_URL, {
            auth: {
                token: "mock-token", // In real app, pass firebase token
            },
        });

        socket.on("connect", () => {
            console.log("[Terminal] Connected to Gateway");
            socket.emit("subscribe_build", deploymentId);
        });

        socket.on("log", (message: string) => {
            setLogs((prev) => [...prev, message]);
        });

        return () => {
            socket.disconnect();
        };
    }, [deploymentId]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-[#0c0c0c] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-white/40" />
                    <span className="text-xs font-mono text-white/60">Live Build Logs</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
            </div>

            {/* Logs Area */}
            <div
                ref={scrollRef}
                className="h-64 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {logs.length === 0 ? (
                    <div className="text-white/20 italic">Waiting for logs...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="break-all text-white/80 border-l-2 border-transparent hover:border-white/10 pl-2 -ml-2 transition-colors">
                            <span className="text-white/30 mr-2 select-none">$</span>
                            {log}
                        </div>
                    ))
                )}
                <div className="h-4" /> {/* Spacer */}
            </div>
        </div>
    );
}
