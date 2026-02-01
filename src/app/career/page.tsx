"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Briefcase, MapPin, TrendingUp, Users, BrainCircuit, Loader2, Sparkles, X } from "lucide-react";
import { generateAIResponse } from "@/lib/mock-ai";

interface Job {
    id: string;
    role: string;
    company: string;
    location: string;
    type: string;
    link: string;
    description: string;
    pubDate: string;
}

interface Trend {
    skill: string;
    growth: number;
    demand: string;
    color: string;
}

export default function CareerPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [trends, setTrends] = useState<Trend[]>([]);
    const [loading, setLoading] = useState(true);

    // AI Analysis State
    const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<{ id: string, content: string } | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/jobs");
                const data = await res.json();
                if (data.jobs && data.trends) {
                    setJobs(data.jobs);
                    setTrends(data.trends);
                }
            } catch (error) {
                console.error("Failed to load career data", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleAnalyze = async (job: Job) => {
        setAnalyzingJobId(job.id);
        setAnalysisResult(null);

        try {
            const prompt = `Analyze this job opportunity for a developer.
            Role: ${job.role} at ${job.company}
            Description Snippet: ${job.description}
            
            Provide a concise 3-bullet point summary:
            1. Key Tech Stack likely required
            2. Potential Career Growth benefit
            3. "Insider Tip" for applying
            Keep it under 100 words.`;

            const insight = await generateAIResponse(prompt);
            setAnalysisResult({ id: job.id, content: insight });
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzingJobId(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-12">

            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h1 className="text-3xl font-bold text-white mb-4">Market Intelligence</h1>
                <p className="text-zinc-400">
                    Real-time insights from <span className="text-blue-400 font-medium">WeWorkRemotely</span> and AI-powered opportunity analysis.
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-zinc-500">Scanning global job markets...</p>
                </div>
            ) : (
                <>
                    {/* Forecast Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="h-6 w-6 text-purple-400" />
                            <h2 className="text-xl font-bold text-white">Live Speculation Forecast</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {trends.map((trend, i) => (
                                <motion.div
                                    key={trend.skill}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-zinc-900 border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all"
                                >
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-semibold text-white">{trend.skill}</h3>
                                            <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">+{trend.growth}% Vol</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-zinc-500">
                                                <span>Demand</span>
                                                <span className="text-white">{trend.demand}</span>
                                            </div>
                                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${trend.growth}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className={`h-full ${trend.color}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${trend.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Jobs Section */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-6 w-6 text-blue-400" />
                                <h2 className="text-xl font-bold text-white">Recommended Opportunities</h2>
                            </div>
                            <div className="text-xs text-zinc-500">
                                Showing top {jobs.length} recent listings
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {jobs.map((job, i) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 + (Math.min(i, 5) * 0.05) }}
                                        className="bg-zinc-900 border border-white/5 p-6 rounded-2xl hover:border-blue-500/30 transition-all group flex flex-col"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 text-sm overflow-hidden">
                                                {job.company.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 border border-white/10 px-2 py-1 rounded-full">
                                                {job.type}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-lg text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1" title={job.role}>{job.role}</h3>
                                        <p className="text-sm text-zinc-400 mb-4 line-clamp-1">{job.company}</p>

                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-6">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {job.location}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                Recent
                                            </div>
                                        </div>

                                        {/* AI Analysis Result if active */}
                                        {analysisResult?.id === job.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-200"
                                            >
                                                <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                                                    <Sparkles className="h-3 w-3" /> AI Insight
                                                    <button onClick={() => setAnalysisResult(null)} className="ml-auto hover:text-white"><X className="h-3 w-3" /></button>
                                                </div>
                                                <div className="prose prose-invert prose-xs max-w-none">
                                                    {/* Simple parsing for list items if AI returns valid md or text */}
                                                    {analysisResult.content.split('\n').map((line, idx) => (
                                                        <p key={idx} className="mb-1 last:mb-0 opacity-90">{line.replace(/^\* |^-\s|^1\.\s/, '• ')}</p>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        <div className="flex items-center gap-2 mt-auto">
                                            <a
                                                href={job.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors border border-white/5"
                                            >
                                                Apply <ArrowUpRight className="h-4 w-4" />
                                            </a>
                                            <button
                                                onClick={() => handleAnalyze(job)}
                                                disabled={analyzingJobId === job.id || analysisResult?.id === job.id}
                                                className={`p-2 rounded-lg border transition-colors ${analysisResult?.id === job.id
                                                        ? "bg-blue-500 border-blue-500 text-white"
                                                        : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                                    }`}
                                                title="Analyze with AI"
                                            >
                                                {analyzingJobId === job.id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <BrainCircuit className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
