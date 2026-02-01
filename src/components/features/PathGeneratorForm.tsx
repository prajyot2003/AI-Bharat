"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function PathGeneratorForm({ onGenerate, isLoading }: { onGenerate: (data: any) => void, isLoading: boolean }) {
    const [goal, setGoal] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate({ goal });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 max-w-2xl"
            >
                <h2 className="text-4xl font-bold text-white tracking-tight">
                    What do you want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">master</span>?
                </h2>
                <p className="text-zinc-400">
                    Enter a skill, job role, or topic, and our AI will construct a personalized, gamified roadmap just for you.
                </p>
            </motion.div>

            <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className="w-full max-w-lg relative"
            >
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g. Full Stack Developer, Machine Learning, Digital Marketing..."
                        className="relative w-full bg-zinc-900 text-white border border-white/10 rounded-xl px-6 py-4 outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-zinc-600 text-lg shadow-xl"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !goal}
                        className="absolute right-2 top-2 bottom-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg px-4 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <ArrowRight className="h-6 w-6" />
                        )}
                    </button>
                </div>
            </motion.form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mt-12">
                {[
                    { icon: Target, title: "Precision", text: "Tailored to your current level" },
                    { icon: BookOpen, title: "Resources", text: "Curated videos & articles" },
                    { icon: Clock, title: "Self-Paced", text: "Deadlines that fit your schedule" }
                ].map((item, i) => (
                    <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="p-4 rounded-xl bg-white/5 border border-white/5 text-left"
                    >
                        <item.icon className="h-6 w-6 text-zinc-500 mb-2" />
                        <h3 className="text-white font-medium">{item.title}</h3>
                        <p className="text-sm text-zinc-500">{item.text}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
