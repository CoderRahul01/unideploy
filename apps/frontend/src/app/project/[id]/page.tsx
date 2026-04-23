"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ChevronRight, ChevronDown, Send, GitBranch, Globe, Lock, AlertCircle, X } from "lucide-react";
import { projectsApi, FileNode, ChatMessage } from "@/lib/api";
import { useDeploymentSocket } from "@/lib/useDeploymentSocket";
import TerminalOutput from "@/components/ui/TerminalOutput";
import SandboxStatusBadge from "@/components/ui/SandboxStatusBadge";
import MultimodalInputBar from "@/components/ui/MultimodalInputBar";

function FileTreeNode({
  node,
  depth,
  onSelect,
  activeFile,
}: {
  node: FileNode;
  depth: number;
  onSelect: (node: FileNode) => void;
  activeFile: string | null;
}) {
  const [open, setOpen] = useState(depth === 0);

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 w-full px-2 py-1 hover:bg-[#1A1A1A] rounded text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )}
          <span>{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.name}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              activeFile={activeFile}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-1 w-full px-2 py-1 rounded text-xs transition-colors ${
        activeFile === node.name
          ? "bg-[#1A1A1A] text-[#F5F5F5]"
          : "text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
      }`}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProjectIDEPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [projectName, setProjectName] = useState<string>(`project-${projectId}`);
  const [projectStatus, setProjectStatus] = useState<string>("CREATED");
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [centreTab, setCentreTab] = useState<"chat" | "editor">("chat");
  const [rightTab, setRightTab] = useState<"preview" | "terminal">("terminal");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [fileStatus, setFileStatus] = useState<"offline" | "live" | "loading">("loading");
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditModalData, setCreditModalData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { logs, status: deployStatus, sandboxUrl } = useDeploymentSocket(deploymentId);

  // Fetch project info on load
  useEffect(() => {
    projectsApi.getProject(projectId).then((p) => {
      setProjectName(p.name);
      setProjectStatus(p.status);
    }).catch(() => {});
  }, [projectId]);

  // Fetch file tree on load
  useEffect(() => {
    setFileStatus("loading");
    projectsApi.getProjectFiles(projectId)
      .then(({ files, status }) => {
        setFileTree(files);
        setFileStatus(status === "live" ? "live" : "offline");
      })
      .catch(() => setFileStatus("offline"));
  }, [projectId]);

  // Reload file tree when deploy goes live
  useEffect(() => {
    if (deployStatus === "live") {
      setProjectStatus("RUNNING");
      projectsApi.getProjectFiles(projectId)
        .then(({ files, status }) => {
          setFileTree(files);
          setFileStatus(status === "live" ? "live" : "offline");
        })
        .catch(() => {});
    }
  }, [deployStatus, projectId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleDeploy = async () => {
    try {
      const result = await projectsApi.deployProduction(projectId);
      setDeploymentId(String(result.deployment_id));
      setRightTab("terminal");
    } catch (err: any) {
      if (err.response?.status === 402) {
        setCreditModalData(err.response.data.detail);
        setShowCreditModal(true);
      } else {
        alert(err?.message || "Failed to trigger production deployment.");
      }
    }
  };

  const terminalLogs = logs.length > 0 ? logs : [];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0A0A0A] text-[#F5F5F5]">
      {/* Top bar */}
      <div className="h-12 border-b border-[#2A2A2A] flex items-center justify-between px-4 flex-shrink-0 bg-[#111111]">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors">
            ← Dashboard
          </a>
          <span className="text-[#2A2A2A]">/</span>
          <span className="text-sm font-semibold text-[#F5F5F5]">{projectName}</span>
          <div className="flex items-center gap-1 text-xs text-[#52525B]">
            <GitBranch className="w-3 h-3" />
            main
          </div>
          <SandboxStatusBadge status={projectStatus} />
          {deployStatus === "live" && (
            <span className="flex items-center gap-1 text-xs text-[#00DC82]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DC82] animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={handleDeploy}
          disabled={deployStatus === "deploying" || deployStatus === "building" || deployStatus === "cloning"}
          className="bg-[#00DC82] text-[#0A0A0A] text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-[#00DC82]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deployStatus === "deploying" || deployStatus === "building" || deployStatus === "cloning"
            ? "Deploying..."
            : "Deploy"}
        </button>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — file tree */}
        <div className="w-[240px] border-r border-[#2A2A2A] flex flex-col overflow-hidden bg-[#111111]">
          <div className="px-3 py-2 border-b border-[#2A2A2A]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#52525B]">
              Explorer
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {fileStatus === "loading" && (
              <div className="px-4 py-6 text-xs text-[#52525B] text-center">Loading files...</div>
            )}
            {fileStatus === "offline" && fileTree.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-4 py-8">
                <Lock className="w-5 h-5 text-[#52525B]" />
                <p className="text-xs text-[#52525B] text-center leading-relaxed">
                  Deploy to browse files
                </p>
              </div>
            )}
            {fileTree.map((node) => (
              <FileTreeNode
                key={node.name}
                node={node}
                depth={0}
                onSelect={(n) => {
                  setActiveFile(n);
                  setCentreTab("editor");
                }}
                activeFile={activeFile?.name ?? null}
              />
            ))}
          </div>
        </div>

        {/* Centre panel — chat / editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-[#2A2A2A] bg-[#111111]">
            {(["chat", "editor"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCentreTab(tab)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors capitalize ${
                  centreTab === tab
                    ? "text-[#F5F5F5] border-b-2 border-[#00DC82]"
                    : "text-[#A1A1AA] hover:text-[#F5F5F5]"
                }`}
              >
                {tab === "chat" ? "AI Chat" : "Code Editor"}
              </button>
            ))}
          </div>

          {centreTab === "chat" ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-[#52525B] text-sm">
                    Ask anything about your project...
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#00DC82]/10 text-[#F5F5F5] border border-[#00DC82]/20"
                          : "bg-[#1A1A1A] text-[#A1A1AA] border border-[#2A2A2A]"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-[#2A2A2A]">
                <MultimodalInputBar
                  projectId={projectId}
                  isTyping={isTyping}
                  setIsTyping={setIsTyping}
                  onUserMessage={(content) => {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `msg-${Date.now()}`,
                        role: "user",
                        content,
                        timestamp: new Date().toISOString(),
                      },
                    ]);
                  }}
                  onAssistantReply={(reply) => {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `msg-${Date.now()}`,
                        role: "assistant",
                        content: reply,
                        timestamp: new Date().toISOString(),
                      },
                    ]);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              {activeFile ? (
                <>
                  <div className="mb-3 text-xs text-[#52525B] font-mono">{activeFile.name}</div>
                  <pre className="text-xs text-[#F5F5F5] font-mono leading-relaxed whitespace-pre-wrap">
                    {activeFile.content ?? ""}
                  </pre>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-[#52525B] text-sm">
                  Select a file from the explorer
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel — preview / terminal */}
        <div className="w-[380px] border-l border-[#2A2A2A] flex flex-col overflow-hidden">
          <div className="flex border-b border-[#2A2A2A] bg-[#111111]">
            {(["preview", "terminal"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors capitalize ${
                  rightTab === tab
                    ? "text-[#F5F5F5] border-b-2 border-[#00DC82]"
                    : "text-[#A1A1AA] hover:text-[#F5F5F5]"
                }`}
              >
                {tab === "preview" ? "Preview" : "Terminal"}
              </button>
            ))}
          </div>

          {rightTab === "preview" ? (
            sandboxUrl ? (
              <iframe
                src={sandboxUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#0A0A0A] text-[#52525B] text-sm">
                <div className="text-center">
                  <div className="w-12 h-12 border-2 border-dashed border-[#2A2A2A] rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-5 h-5" />
                  </div>
                  <p>Preview available after deployment</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 overflow-hidden">
              <TerminalOutput logs={terminalLogs} status={deployStatus} />
            </div>
          )}
        </div>
      </div>

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-[#00DC82]/10 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-[#00DC82]" />
                </div>
                <button onClick={() => setShowCreditModal(false)} className="text-[#52525B] hover:text-[#F5F5F5] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-bold mb-2">Insufficient Credits</h3>
              <p className="text-[#A1A1AA] text-sm leading-relaxed mb-6">
                You need <span className="text-[#F5F5F5] font-semibold">{creditModalData?.required} credits</span> to push to production. 
                Your current balance is <span className="text-[#F5F5F5] font-semibold">{creditModalData?.available} credits</span>.
              </p>
              
              <div className="space-y-3">
                <button className="w-full bg-[#00DC82] text-[#0A0A0A] font-bold py-3 rounded-xl hover:bg-[#00DC82]/90 transition-all flex items-center justify-center gap-2">
                  Top Up Credits
                </button>
                <button onClick={() => setShowCreditModal(false)} className="w-full bg-transparent text-[#A1A1AA] font-medium py-3 rounded-xl hover:bg-[#1A1A1A] transition-all">
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
