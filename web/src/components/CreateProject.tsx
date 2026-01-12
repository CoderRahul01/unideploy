"use client";

import { useState } from "react";
import {
  X,
  Upload,
  Github,
  Globe,
  Loader2,
  CheckCircle2,
  Rocket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/lib/api";
import axios from "axios";
import AIThinking from "./AIThinking";

export default function CreateProject({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [deploymentId, setDeploymentId] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [thinkingStep, setThinkingStep] = useState(0);

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    setLoading(true);
    setThinkingStep(0);

    const interval = setInterval(() => {
      setThinkingStep(prev => (prev < 5 ? prev + 1 : prev));
    }, 1500);

    try {
      const result = await projectsApi.analyze(repoUrl);
      setAnalysis(result);
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
      setThinkingStep(prev => (prev < 5 ? prev + 1 : prev));
    }, 1000);

    try {
      const result = await projectsApi.analyzeZip(file);
      setAnalysis(result);
      setThinkingStep(5);
      setTimeout(() => setStep(4), 500);
    } catch (err: any) {
      alert(err.message || "Zip Analysis failed.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      // 1. Create project with analysis results
      const project = await projectsApi.create(
        projectName,
        analysis?.type,
        analysis?.port
      );

      // 2. Upload/Deploy
      let deployment;
      if (file) {
        deployment = await projectsApi.deploy(project.id, file);
      } else if (repoUrl) {
        // Deploy from Git using analysis results
        deployment = await projectsApi.deployFromGit(project.id, repoUrl);
      } else {
        alert("No source (file or repo URL) provided for deployment.");
        return;
      }

      setDeploymentId(deployment.deployment_id.toString());
      setStep(3);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Deployment failed.");
    } finally {
      setLoading(false);
    }
  };

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

            {!loading && step === 1 && (
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
                    desc="Import from repo"
                    onClick={() => {
                      if (!projectName.trim()) {
                        alert("Please enter a project name first");
                        return;
                      }
                      setStep(5);
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
                    {step === 5 ? "Run Magic Analysis 💥" : "Deploy Now"}
                  </button>
                </div>
              </motion.div>
            )}

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
                  <p className="text-xs text-white/60 mb-4">
                    UniDeploy AI has scanned your repository.
                  </p>

                  <div className="space-y-3">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Recommended Infrastructure</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white tracking-tight">{analysis?.recommended_tier || "SEED"}</span>
                        <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">PROPOSAL</span>
                      </div>
                      <p className="text-xs text-white/60 mt-2 leading-relaxed italic">
                        "{analysis?.tier_reasoning}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Stack</p>
                        <p className="font-mono text-purple-400 capitalize">{analysis?.type}</p>
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
                  <button
                    onClick={handleFinalize}
                    className="flex-[2] px-6 py-3 rounded-xl bg-green-500 text-black text-sm font-black hover:bg-green-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/10"
                  >
                    Finalize & Market Launch 🚀
                  </button>
                </div>
              </motion.div>
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
