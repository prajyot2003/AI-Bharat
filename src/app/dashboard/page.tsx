"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Award, BookOpen, BrainCircuit, ChevronRight, Zap } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Welcome back, Traveler</h1>
                    <p className="text-zinc-400">Your journey to mastery continues.</p>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full text-orange-400">
                    <Zap className="h-4 w-4 fill-orange-400" />
                    <span className="font-bold">Daily Streak: 3 Days</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    icon={Activity}
                    title="Progress"
                    value="15%"
                    sub="3 Modules Completed"
                    color="bg-blue-500"
                />
                <StatsCard
                    icon={Award}
                    title="XP Earned"
                    value="450 XP"
                    sub="Next Level: 1000 XP"
                    color="bg-purple-500"
                />
                <StatsCard
                    icon={BrainCircuit}
                    title="Skills Tracked"
                    value="4"
                    sub="React, Typescript, Design, AI"
                    color="bg-emerald-500"
                />
            </div>

            {/* Continue Learning */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Continue Learning</h2>
                    <Link href="/learning-path" className="text-sm text-blue-400 hover:text-blue-300">View Map</Link>
                </div>

                <Link href="/learning-path">
                    <div className="group relative overflow-hidden bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">Frontend Mastery</h3>
                                    <p className="text-zinc-500 text-sm">Next Step: React Basics - Video Tutorial</p>
                                </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-zinc-600 group-hover:translate-x-1 transition-transform" />
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-zinc-400">Level 1 Progress</span>
                                <span className="text-white">45%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[45%]" />
                            </div>
                        </div>
                    </div>
                </Link>
            </section>

            {/* Badge Showcase */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4">Your Achievements</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Badge title="First Steps" icon="🚀" unlocked={true} date="2 days ago" />
                    <Badge title="Code Warrior" icon="⚔️" unlocked={true} date="Yesterday" />
                    <Badge title="Bug Hunter" icon="🐛" unlocked={false} date="Locked" />
                    <Badge title="AI Whiz" icon="🤖" unlocked={false} date="Locked" />
                </div>
            </section>
        </div>
    );
}

function StatsCard({ icon: Icon, title, value, sub, color }: any) {
    return (
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
                    <Icon className={`h-5 w-5 text-white`} />
                </div>
                <span className="text-zinc-400 text-sm font-medium">{title}</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-zinc-500">{sub}</div>
        </div>
    )
}

function Badge({ title, icon, unlocked, date }: any) {
    return (
        <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 ${unlocked ? 'bg-zinc-900 border-white/10' : 'bg-zinc-900/50 border-white/5 opacity-50'}`}>
            <div className={`text-3xl ${unlocked ? '' : 'filter grayscale'}`}>{icon}</div>
            <div>
                <div className="font-bold text-white text-sm">{title}</div>
                <div className="text-xs text-zinc-500">{date}</div>
            </div>
        </div>
    )
}
