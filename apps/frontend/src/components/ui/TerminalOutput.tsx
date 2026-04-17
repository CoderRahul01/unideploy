"use client";

import { useEffect, useRef } from "react";

interface TerminalOutputProps {
  logs: string[];
  status?: string;
}

function getLineColour(line: string): string {
  if (line.includes("[ERR]") || line.toLowerCase().includes("error") || line.includes("failed")) {
    return "text-red-500";
  }
  if (line.includes("[System]") || line.startsWith("[Git]") || line.startsWith("[Build]")) {
    return "text-yellow-400";
  }
  if (line.includes("live") || line.includes("successful") || line.includes("✓")) {
    return "text-[#00DC82]";
  }
  return "text-[#A1A1AA]";
}

export default function TerminalOutput({ logs, status }: TerminalOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="h-full bg-[#0A0A0A] font-mono text-xs p-4 overflow-y-auto flex flex-col">
      {status === "live" && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#1A1A1A]">
          <span className="w-2 h-2 rounded-full bg-[#00DC82] animate-pulse" />
          <span className="text-[#00DC82] font-semibold tracking-wide">Sandbox Live</span>
        </div>
      )}
      {logs.length === 0 ? (
        <div className="text-[#52525B] leading-relaxed">Waiting for logs...</div>
      ) : (
        logs.map((line, i) => (
          <div key={i} className={`leading-relaxed ${getLineColour(line)}`}>
            {line}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
