"use client";

import { useState } from "react";
import { X, Upload, Github, Globe, Loader2, CheckCircle2, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/lib/api";
import axios from "axios";

export default function CreateProject({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [deploymentId, setDeploymentId] = useState("");

    const handleUpload = async () => {
        if (!projectName || !file) {
            alert("Please provide a project name and file.");
            return;
        }
        setLoading(true);

        try {
            // 1. Create project
            const project = await projectsApi.create(projectName);

            // 2. Upload and deploy
            const deployment = await projectsApi.deploy(project.id, file);

            setDeploymentId(deployment.deployment_id.toString());
            setStep(3);
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Deployment failed. Make sure backend is running.");
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
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 block">Project Name</label>
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
                                            setStep(2);
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

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8"
                            >
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
                                        <p className="text-sm font-medium mb-1">{file ? file.name : "Select a project ZIP file"}</p>
                                        <p className="text-xs text-white/40">or drag and drop here</p>
                                    </label>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setStep(1)} className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-all">Back</button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={!file || loading || !projectName}
                                        className="flex-[2] px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                        Deploy Now
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
                                <h3 className="text-2xl font-bold mb-2">Build Triggered!</h3>
                                <p className="text-white/50 text-sm mb-8 leading-relaxed">
                                    Your project <span className="text-white">"{projectName}"</span> is being prepared for production.
                                    We're detecting your framework and allocating resources.
                                </p>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-8 text-left">
                                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Deployment Instance</p>
                                    <p className="text-sm font-mono text-purple-400">{deploymentId}</p>
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

function SelectionCard({ icon, label, desc, onClick }: { icon: React.ReactNode, label: string, desc: string, onClick: () => void }) {
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
