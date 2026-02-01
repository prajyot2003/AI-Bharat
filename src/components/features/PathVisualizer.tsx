"use client";

import { motion } from "framer-motion";
import { Check, Lock, Star, Trophy, Video, Book } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Remove local type definition as we import it from mock-ai


// Mock path for demo
import { PathNode } from "@/lib/mock-ai";

export function PathVisualizer({ goal, initialPath }: { goal: string, initialPath: PathNode[] }) {
    // Local state to track progress
    const [path, setPath] = useState(Array.isArray(initialPath) ? initialPath : []);
    const [selectedNode, setSelectedNode] = useState<PathNode | null>(null);

    const totalXP = path.reduce((acc, node) => node.status === "completed" ? acc + node.xp : acc, 0);

    const handleNodeClick = (node: PathNode) => {
        if (node.status === "locked") return;
        setSelectedNode(node);
    };

    const handleComplete = () => {
        if (!selectedNode) return;

        setPath(prev => {
            const idx = prev.findIndex(n => n.id === selectedNode.id);
            const newPath = [...prev];

            // Complete current
            newPath[idx] = { ...newPath[idx], status: "completed" };

            // Unlock next
            if (idx + 1 < newPath.length) {
                newPath[idx + 1] = { ...newPath[idx + 1], status: "unlocked" };
            }

            return newPath;
        });
        setSelectedNode(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            {/* Header / Stats */}
            <div className="flex items-center justify-between mb-12 p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 border border-white/10 shadow-2xl">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Learning: {goal}</h2>
                    <p className="text-white/60 text-sm">Level 1 Novice</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold text-2xl">
                        <Trophy className="h-6 w-6" />
                        <span>{totalXP} XP</span>
                    </div>
                    <p className="text-white/40 text-xs mt-1">Next Reward at 500 XP</p>
                </div>
            </div>

            {/* Path Map */}
            <div className="relative">
                {/* Vertical connecting line */}
                <div className="absolute left-[2rem] md:left-1/2 top-4 bottom-4 w-1 bg-white/10 -translate-x-1/2 rounded-full" />

                <div className="space-y-12">
                    {path.map((node, index) => {
                        const isLeft = index % 2 === 0;
                        const Icon = node.type === "video" ? Video : node.type === "article" ? Book : Star;
                        const isLocked = node.status === "locked";
                        const isCompleted = node.status === "completed";

                        return (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "relative flex items-center gap-8",
                                    isLeft ? "md:flex-row-reverse" : "md:flex-row"
                                )}
                            >
                                {/* Content Card */}
                                <div className="flex-1 min-w-0 hidden md:block group cursor-pointer" onClick={() => handleNodeClick(node)}>
                                    <div className={cn(
                                        "p-6 rounded-2xl border transition-all duration-300 transform",
                                        isLocked ? "bg-zinc-900/50 border-white/5 opacity-50 grayscale" :
                                            isCompleted ? "bg-emerald-900/10 border-emerald-500/20 hover:bg-emerald-900/20 hover:-translate-y-1" :
                                                "bg-zinc-800 border-white/10 hover:border-blue-500/50 hover:bg-zinc-800/80 hover:-translate-y-1 shadow-lg"
                                    )}>
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className={cn("font-bold text-lg", isLocked ? "text-zinc-500" : "text-white")}>{node.title}</h3>
                                            <span className="text-xs font-mono text-white/30">{node.xp} XP</span>
                                        </div>
                                        <p className="text-zinc-400 text-sm">{node.description}</p>
                                    </div>
                                </div>

                                {/* Center Node */}
                                <div className="relative z-10 shrink-0">
                                    <button
                                        onClick={() => handleNodeClick(node)}
                                        disabled={isLocked}
                                        className={cn(
                                            "h-16 w-16 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)]",
                                            isLocked ? "bg-zinc-900 border-zinc-700 text-zinc-600" :
                                                isCompleted ? "bg-emerald-500 border-emerald-900 text-white shadow-emerald-500/20" :
                                                    "bg-blue-600 border-blue-900 text-white animate-pulse shadow-blue-500/20 scale-110"
                                        )}>
                                        {isCompleted ? <Check className="h-8 w-8" /> : isLocked ? <Lock className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                                    </button>
                                </div>

                                {/* Mobile Content Card (Always right of node usually, but here we just layout intuitively) */}
                                <div className="flex-1 min-w-0 md:hidden block cursor-pointer" onClick={() => handleNodeClick(node)}>
                                    <div className={cn(
                                        "p-4 rounded-xl border",
                                        isLocked ? "bg-zinc-900/50 border-white/5 opacity-50" : "bg-zinc-800 border-white/10"
                                    )}>
                                        <h3 className="font-bold text-white mb-1">{node.title}</h3>
                                        <p className="text-zinc-400 text-sm">{node.description}</p>
                                    </div>
                                </div>

                                {/* Spacer for desktop alignment */}
                                <div className="flex-1 hidden md:block"></div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Action Modal (Simple overlay for demo) */}
            {selectedNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <h3 className="text-2xl font-bold text-white mb-2">{selectedNode.title}</h3>
                        <p className="text-zinc-400 mb-6">{selectedNode.description}</p>

                        <div className="aspect-video bg-black rounded-lg mb-6 flex items-center justify-center border border-zinc-800">
                            <Video className="h-12 w-12 text-zinc-700" />
                            <span className="ml-2 text-zinc-600">Content Placeholder</span>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleComplete}
                                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors font-medium shadow-lg shadow-emerald-500/20"
                            >
                                Mark Complete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
