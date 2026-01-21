"use client";

import { motion } from "framer-motion";
import { Sparkles, Brain, Cpu, Zap } from "lucide-react";

const steps = [
    "Cloning repository...",
    "Analyzing codebase structure...",
    "Detecting frameworks and dependencies...",
    "Consulting historical wisdom...",
    "Optimizing infrastructure tiers...",
    "Finalizing recommendations..."
];

export default function AIThinking({ currentStep = 0 }: { currentStep?: number }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-8">
            <div className="relative">
                {/* Outer Glow */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-purple-500 rounded-full blur-3xl"
                />

                {/* Pulsing Brain Icon */}
                <motion.div
                    animate={{
                        rotateY: [0, 360],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="relative bg-black/40 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-2xl"
                >
                    <Brain className="w-16 h-16 text-purple-400" />
                </motion.div>

                {/* Orbiting Elements */}
                <OrbitingIcon
                    delay={0}
                    radius={60}
                    duration={4}
                    icon={<Cpu className="w-4 h-4 text-purple-500" />}
                />
                <OrbitingIcon
                    delay={1.5}
                    radius={70}
                    duration={5}
                    icon={<Zap className="w-4 h-4 text-yellow-500" />}
                />
                <OrbitingIcon
                    delay={3}
                    radius={65}
                    duration={6}
                    icon={<Sparkles className="w-4 h-4 text-blue-400" />}
                />
            </div>

            <div className="text-center space-y-4 max-w-xs">
                <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                    AI is Thinking...
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        ✨
                    </motion.span>
                </h3>

                <div className="space-y-2">
                    {steps.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                                opacity: i <= currentStep ? 1 : 0.2,
                                y: 0,
                                scale: i === currentStep ? 1.05 : 1
                            }}
                            className={`text-xs font-mono flex items-center gap-3 ${i === currentStep ? 'text-purple-400' : 'text-white/40'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${i <= currentStep ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-white/10'}`} />
                            {step}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function OrbitingIcon({ delay, radius, duration, icon }: { delay: number; radius: number; duration: number; icon: React.ReactNode }) {
    return (
        <motion.div
            animate={{
                rotate: 360,
            }}
            transition={{
                duration,
                repeat: Infinity,
                ease: "linear",
                delay,
            }}
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 0,
                height: 0,
            }}
        >
            <motion.div
                style={{
                    position: "absolute",
                    top: -radius,
                    left: -12,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    padding: "6px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.05)",
                    backdropFilter: "blur(4px)",
                }}
            >
                {icon}
            </motion.div>
        </motion.div>
    );
}
