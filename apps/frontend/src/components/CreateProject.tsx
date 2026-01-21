"use client";

import { useState, useEffect } from "react";
import {
  X,
  Upload,
  Globe,
  Loader2,
  CheckCircle2,
  Rocket,
  Plus,
  Search,
  Zap,
  Github,
  ChevronRight,
  Server,
  Cpu,
  Sparkles,
  Trash2,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/lib/api";
import { loginWithGithub } from "@/lib/firebase";
import { GithubAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AIThinking from "./AIThinking";

export default function CreateProject({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [thinkingStep, setThinkingStep] = useState(0);

  // Repo Picker State
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("SEED");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);

  const handleGithubLogin = async () => {
    try {
      setFetchingRepos(true);
      const result = await loginWithGithub();
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGithubToken(token);
        const repos = await projectsApi.getGithubRepos(token);
        setGithubRepos(repos);
        setStep(5);
      }
    } catch (err: any) {
      alert(err.message || "GitHub Login failed");
    } finally {
      setFetchingRepos(false);
    }
  };

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    setLoading(true);
    setThinkingStep(0);

    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 1500);

    try {
      const result = await projectsApi.analyze(repoUrl);
      setAnalysis(result);
      setSelectedTier(result.recommended_tier || "SEED");
      setThinkingStep(5);
      setTimeout(() => setStep(4), 500);
    } catch (err: any) {
      alert(err.message || "Analysis failed.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleZipAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setThinkingStep(0);

    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 1000);

    try {
      const result = await projectsApi.analyzeZip(file);
      setAnalysis(result);
      setSelectedTier(result.recommended_tier || "SEED");
      setThinkingStep(5);
      setTimeout(() => setStep(4), 500);
    } catch (err: any) {
      alert(err.message || "Zip Analysis failed.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleAddEnv = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index: number, field: "key" | "value", val: string) => {
    const next = [...envVars];
    next[index][field] = val;
    setEnvVars(next);
  };

  const handleFinalize = async () => {
    setLoading(true);
    setIsProvisioning(true);

    try {
      // Convert list to dict
      const envDict: Record<string, string> = {};
      envVars.forEach((ev) => {
        if (ev.key.trim()) envDict[ev.key.trim()] = ev.value;
      });

      const project = await projectsApi.create(
        projectName || "my-awesome-project",
        analysis?.framework || "unknown",
        analysis?.port || 80,
        selectedTier,
        envDict
      );

      let deployment;
      if (file) {
        deployment = await projectsApi.deploy(project.id, file);
      } else if (repoUrl) {
        deployment = await projectsApi.deployFromGit(project.id, repoUrl);
      } else {
        alert("No source provided for deployment.");
        setIsProvisioning(false);
        setLoading(false);
        return;
      }

      setDeploymentId(deployment.deployment_id.toString());
      // Wait a bit to show off the provisioning animation
      setTimeout(() => {
        setIsProvisioning(false);
        setStep(3);
      }, 3000);
    } catch (err: any) {
      alert(err.message || "Deployment failed.");
      setIsProvisioning(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = githubRepos.filter((repo) =>
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111] border border-white/10 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold">New Deployment</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {loading && step === 5 && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AIThinking currentStep={thinkingStep} />
              </motion.div>
            )}

            {isProvisioning && (
              <motion.div
                key="provisioning"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-8"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <motion.div
                    animate={{
                      rotate: 360,
                      borderRadius: ["40%", "50%", "40%"]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-blue-600 opacity-20 blur-xl"
                  />
                  <div className="relative w-full h-full bg-black/40 rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl">
                    <Server className="w-10 h-10 text-purple-400 animate-pulse" />
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 border-2 border-purple-500/30 rounded-3xl"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#111] border border-white/10 rounded-xl flex items-center justify-center shadow-lg">
                    <Cpu className="w-5 h-5 text-blue-400 animate-spin-slow" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold tracking-tight">Allocating {selectedTier} Resources</h3>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-purple-500"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/40 font-medium">Provisioning secure E2B sandbox...</p>
                  </div>
                </div>

                <div className="max-w-xs mx-auto bg-white/5 rounded-xl p-3 border border-white/5 text-[10px] font-mono text-white/30 text-left space-y-1">
                  <p>{">"} Checking cloud availability...</p>
                  <p>{">"} Mapping {selectedTier} hardware specs...</p>
                  <p className="text-purple-400/50">{">"} Initializing Firecracker VM...</p>
                </div>
              </motion.div>
            )}

            {!loading && !isProvisioning && step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 block">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-app"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <SelectionCard
                    icon={<Github className="w-6 h-6" />}
                    label="GitHub"
                    desc="Connect & Import"
                    onClick={() => {
                      if (!projectName.trim()) {
                        alert("Please enter a project name first");
                        return;
                      }
                      handleGithubLogin();
                    }}
                  />
                  <SelectionCard
                    icon={<Upload className="w-6 h-6" />}
                    label="Upload"
                    desc="Drop ZIP file"
                    onClick={() => {
                      if (!projectName.trim()) {
                        alert("Please enter a project name first");
                        return;
                      }
                      setStep(2);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {!loading && (step === 2 || step === 5) && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                {step === 5 ? (
                  <div className="space-y-4">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block">
                      GitHub Repository URL
                    </label>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/user/repo"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-purple-500/30 transition-all bg-white/[0.01]">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".zip"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-sm font-medium mb-1">
                        {file ? file.name : "Select a project ZIP file"}
                      </p>
                      <p className="text-xs text-white/40">
                        or drag and drop here
                      </p>
                    </label>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={step === 5 ? handleAnalyze : handleZipAnalysis}
                    disabled={(step === 5 ? !repoUrl : !file) || loading || !projectName}
                    className="flex-[2] px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                    Deploy Now
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Repo Picker */}
            {!loading && step === 5 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Select Repository</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search repos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => {
                        setRepoUrl(repo.clone_url);
                        handleAnalyze();
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-purple-500/20">
                          <Github className="w-5 h-5 text-white/60 group-hover:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight capitalize">{repo.name}</p>
                          <p className="text-[10px] text-white/40 font-mono">{repo.full_name}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                  {filteredRepos.length === 0 && (
                    <div className="py-20 text-center opacity-40">
                      <Search className="w-8 h-8 mx-auto mb-3" />
                      <p className="text-sm font-medium">No projects found</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="w-full py-3 rounded-xl bg-white/5 text-white/40 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Back to selection
                </button>
              </motion.div>
            )}

            {/* Step 4: Analysis Results */}
            {!loading && step === 4 && (
              <motion.div
                key="step4"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Rocket className="w-16 h-16 -rotate-45" />
                  </div>
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Analysis Complete
                  </h3>
                  <p className="text-xs text-white/60 mb-6">
                    Select your infrastructure package to proceed.
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <TierCard
                        tier="SEED"
                        specs="1 vCPU • 512MB • 10m"
                        active={selectedTier === "SEED"}
                        recommended={analysis?.recommended_tier === "SEED"}
                        onClick={() => setSelectedTier("SEED")}
                      />
                      <TierCard
                        tier="LAUNCH"
                        specs="1 vCPU • 1GB • 30m"
                        active={selectedTier === "LAUNCH"}
                        recommended={analysis?.recommended_tier === "LAUNCH"}
                        onClick={() => setSelectedTier("LAUNCH")}
                      />
                      <TierCard
                        tier="SCALE"
                        specs="1 vCPU • 2GB • 1h"
                        active={selectedTier === "SCALE"}
                        recommended={analysis?.recommended_tier === "SCALE"}
                        onClick={() => setSelectedTier("SCALE")}
                      />
                    </div>

                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1 leading-none">AI Insight</p>
                      <p className="text-xs text-white/60 leading-relaxed italic">
                        "{analysis?.tier_reasoning || "Optimized for your current workload."}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Stack</p>
                        <p className="font-mono text-purple-400 capitalize">{analysis?.type || "Static"}</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Port</p>
                        <p className="font-mono text-purple-400">{analysis?.port || 3000}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(5)}
                    className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-all shadow-lg"
                  >
                    Rescan
                  </button>
                  <div className="pt-6 border-t border-white/5 flex gap-3">
                    <button
                      onClick={() => setStep(step === 4 ? 6 : 4)}
                      className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <div className="space-y-8 py-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <Lock className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter">Environment Variables</h2>
                    <p className="text-white/40 text-sm font-medium">Add secrets and configuration for your app.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {envVars.map((ev, i) => (
                    <div key={i} className="flex gap-2 items-center group">
                      <input
                        type="text"
                        placeholder="KEY (e.g. API_KEY)"
                        value={ev.key}
                        onChange={(e) => handleEnvChange(i, "key", e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-mono focus:border-purple-500/50 outline-none transition-all"
                      />
                      <input
                        type="text"
                        placeholder="VALUE"
                        value={ev.value}
                        onChange={(e) => handleEnvChange(i, "value", e.target.value)}
                        className="flex-[1.5] bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-mono focus:border-purple-500/50 outline-none transition-all"
                      />
                      <button
                        onClick={() => handleRemoveEnv(i)}
                        className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleAddEnv}
                    className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add Another Variable
                  </button>
                </div>

                <div className="pt-6 flex gap-3">
                  <button
                    onClick={() => setStep(4)}
                    className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-sm hover:bg-white/10 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinalize}
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    Finalize & Provision
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Market Ready Triggered!</h3>
                <p className="text-white/50 text-sm mb-8 leading-relaxed">
                  Your project{" "}
                  <span className="text-white">"{projectName}"</span> is being
                  prepared for production. We're allocating your recommended <strong>{analysis?.recommended_tier || "SEED"}</strong> resources.
                </p>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-8 text-left">
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">
                    Deployment Instance
                  </p>
                  <p className="text-sm font-mono text-purple-400">
                    {deploymentId}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full bg-white text-black py-4 rounded-xl font-bold text-sm tracking-wide hover:bg-white/90 transition-all shadow-xl shadow-white/5"
                >
                  View Deployment Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function SelectionCard({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] text-left hover:border-purple-500/50 hover:bg-white/[0.04] transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-bold mb-1">{label}</h3>
      <p className="text-xs text-white/40">{desc}</p>
    </button>
  );
}

function TierCard({
  tier,
  specs,
  active,
  recommended,
  onClick,
}: {
  tier: string;
  specs: string;
  active: boolean;
  recommended: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border transition-all text-left flex flex-col gap-1 ${active
        ? "bg-purple-500/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
        : "bg-white/5 border-white/5 hover:border-white/10"
        }`}
    >
      {recommended && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
          Best
        </div>
      )}
      <p className={`text-xs font-black tracking-tighter ${active ? "text-purple-400" : "text-white/60"}`}>
        {tier}
      </p>
      <p className="text-[9px] text-white/40 font-medium whitespace-nowrap">
        {specs}
      </p>
      {active && (
        <motion.div
          layoutId="activeTier"
          className="absolute inset-x-0 -bottom-1 h-0.5 bg-purple-500 mx-4 rounded-full"
        />
      )}
    </button>
  );
}
