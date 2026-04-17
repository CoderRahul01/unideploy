"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Project, projectsApi } from "@/lib/api";
import SandboxStatusBadge from "./SandboxStatusBadge";
import CreditUsageBar from "./CreditUsageBar";
import DeployButton from "./DeployButton";

interface ProjectCardProps {
  project: Project;
  isLocked: boolean;
  onUpdate: () => void;
  onMutationStart: () => void;
  onMutationEnd: () => void;
  onError: (msg: string | null) => void;
  onClick?: () => void;
}

export default function ProjectCard({
  project,
  isLocked,
  onUpdate,
  onMutationStart,
  onMutationEnd,
  onError,
  onClick,
}: ProjectCardProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const { id, name, status, daily_runtime_minutes, domain } = project;

  const handleStart = async () => {
    if (isLocked || localLoading) return;
    setLocalLoading(true);
    onMutationStart();
    onError(null);
    try {
      await projectsApi.start(id);
      await onUpdate();
    } catch (err: any) {
      onError(err.message || "Action failed");
    } finally {
      setLocalLoading(false);
      onMutationEnd();
    }
  };

  const handleStop = async () => {
    if (isLocked || localLoading) return;
    setLocalLoading(true);
    onMutationStart();
    onError(null);
    try {
      await projectsApi.stop(id);
      await onUpdate();
    } catch (err: any) {
      onError(err.message || "Action failed");
    } finally {
      setLocalLoading(false);
      onMutationEnd();
    }
  };

  const showUsageBar =
    status === "RUNNING" || status === "WAKING" || status === "building" || status === "deploying";

  return (
    <div
      onClick={onClick}
      className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-[#F5F5F5] text-sm uppercase tracking-tight group-hover:text-[#00DC82] transition-colors">
          {name}
        </h3>
        <SandboxStatusBadge status={status} />
      </div>

      <div className="mb-4 min-h-[32px]">
        {domain ? (
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:underline"
          >
            <Globe className="w-3 h-3" />
            {domain}
          </a>
        ) : (
          <p className="text-xs text-[#52525B]">Provisioning...</p>
        )}
        {showUsageBar && (
          <div className="mt-2">
            <CreditUsageBar used={daily_runtime_minutes} total={60} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#52525B]">
          {project.last_active_at
            ? `Active ${new Date(project.last_active_at).toLocaleDateString()}`
            : "Never active"}
        </p>
        <DeployButton
          status={status}
          onStart={handleStart}
          onStop={handleStop}
          isLoading={localLoading}
          isLocked={isLocked}
        />
      </div>
    </div>
  );
}
