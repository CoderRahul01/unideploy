"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, XCircle, Clock, MinusCircle } from "lucide-react";
import { mockDeployments, MockDeployment } from "@/lib/mockData";
import TerminalOutput from "@/components/ui/TerminalOutput";

function StatusBadge({ status }: { status: MockDeployment["status"] }) {
  const config = {
    success: { icon: CheckCircle2, colour: "text-[#00DC82]", bg: "bg-[#00DC82]/10", label: "Success" },
    failed: { icon: XCircle, colour: "text-[#EF4444]", bg: "bg-[#EF4444]/10", label: "Failed" },
    building: { icon: Clock, colour: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10", label: "Building" },
    cancelled: { icon: MinusCircle, colour: "text-[#A1A1AA]", bg: "bg-[#A1A1AA]/10", label: "Cancelled" },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${c.colour} ${c.bg}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export default function DeploymentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selected, setSelected] = useState<MockDeployment | null>(null);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      <div className="border-b border-[#2A2A2A] px-6 py-4 flex items-center gap-3 bg-[#111111]">
        <a href={`/project/${projectId}`} className="text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors">
          ← Project
        </a>
        <span className="text-[#2A2A2A]">/</span>
        <span className="text-sm font-semibold">Deployments</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold mb-6">Deployment History</h1>

        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[#A1A1AA]">Commit</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#A1A1AA]">Branch</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#A1A1AA]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#A1A1AA]">Duration</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#A1A1AA]">Deployed</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {mockDeployments.map((dep, i) => (
                <tr
                  key={dep.id}
                  className={`border-b border-[#2A2A2A] last:border-0 hover:bg-[#1A1A1A] transition-colors ${
                    i % 2 === 0 ? "" : "bg-[#0A0A0A]/50"
                  }`}
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-[#F5F5F5] text-xs truncate max-w-[240px]">
                        {dep.commitMessage}
                      </p>
                      <p className="text-[10px] font-mono text-[#52525B] mt-0.5">{dep.commitSha}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono text-[#A1A1AA]">{dep.branch}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={dep.status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-[#A1A1AA]">{dep.duration}</td>
                  <td className="px-5 py-4 text-xs text-[#52525B]">
                    {new Date(dep.deployedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelected(dep)}
                      className="text-xs text-[#3B82F6] hover:underline"
                    >
                      View logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-[480px] bg-[#111111] border-l border-[#2A2A2A] z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
                <div>
                  <p className="font-semibold text-sm text-[#F5F5F5]">{selected.commitMessage}</p>
                  <p className="text-xs font-mono text-[#52525B] mt-0.5">{selected.commitSha}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TerminalOutput logs={selected.logs} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
