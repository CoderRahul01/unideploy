import { Project } from "@/lib/api";

type Status = Project["status"];

const STATUS_CONFIG: Record<
  Status,
  { dot: string; text: string; label: string; spin?: boolean }
> = {
  RUNNING: { dot: "bg-[#00DC82] animate-pulse", text: "text-[#00DC82]", label: "Running" },
  WAKING: { dot: "bg-[#F59E0B]", text: "text-[#F59E0B]", label: "Waking", spin: true },
  building: { dot: "bg-[#F59E0B]", text: "text-[#F59E0B]", label: "Building", spin: true },
  deploying: { dot: "bg-[#F59E0B]", text: "text-[#F59E0B]", label: "Deploying", spin: true },
  SLEEPING: { dot: "bg-[#3B82F6]", text: "text-[#3B82F6]", label: "Sleeping" },
  CREATED: { dot: "bg-[#A1A1AA]", text: "text-[#A1A1AA]", label: "Created" },
  BUILT: { dot: "bg-[#A1A1AA]", text: "text-[#A1A1AA]", label: "Built" },
};

interface SandboxStatusBadgeProps {
  status: string;
}

export default function SandboxStatusBadge({ status }: SandboxStatusBadgeProps) {
  const c = STATUS_CONFIG[status as Status] ?? { dot: "bg-[#52525B]", text: "text-[#52525B]", label: status };

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.spin ? "animate-spin" : ""}`}
      />
      <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>
        {c.label}
      </span>
    </span>
  );
}
