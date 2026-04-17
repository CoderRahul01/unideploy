"use client";

import { Loader2 } from "lucide-react";
import { Project } from "@/lib/api";

interface DeployButtonProps {
  status: Project["status"];
  onStart: () => void;
  onStop: () => void;
  isLoading: boolean;
  isLocked: boolean;
}

export default function DeployButton({
  status,
  onStart,
  onStop,
  isLoading,
  isLocked,
}: DeployButtonProps) {
  const canWake = status === "SLEEPING" || status === "BUILT";
  const canStop = status === "RUNNING";
  const isTransitioning = status === "WAKING" || status === "building" || status === "deploying";

  if (!canWake && !canStop && !isTransitioning) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked || isLoading || isTransitioning) return;
    canStop ? onStop() : onStart();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLocked || isLoading || isTransitioning}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all min-w-[72px] flex items-center justify-center ${
        canStop
          ? "bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20"
          : "bg-[#00DC82]/10 text-[#00DC82] hover:bg-[#00DC82]/20"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {isLoading || isTransitioning ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : canStop ? (
        "Stop"
      ) : (
        "Wake"
      )}
    </button>
  );
}
