"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, Rocket, Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const features = [
    {
      icon: Target,
      title: "Personalized Paths",
      description: "AI-curated learning roadmaps tailored to your goals and pace.",
      link: "/learning-path",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: BrainCircuit,
      title: "AI Mentor",
      description: "24/7 guidance from our advanced AI assistant to unblock your progress.",
      link: "/chat",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: "Career Forecast",
      description: "Data-driven predictions on future skills demand and job market trends.",
      link: "/career",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Rocket,
      title: "Job Launchpad",
      description: "Match with apprenticeships and jobs that fit your new skills.",
      link: "/career",
      color: "from-emerald-500 to-green-500"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-24 pb-12 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-950/0 to-zinc-950/0" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-cyan-400 mb-4 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            AI-Powered Learning Revolution
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Forge Your Future with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              Intelligent Learning
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Stop guessing. Start growing. Generate personalized learning paths, get instant AI mentorship, and track your career trajectory in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/learning-path" className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md bg-zinc-50 px-8 font-medium text-zinc-950 transition-all duration-300 hover:bg-white hover:ring-2 hover:ring-zinc-500 hover:ring-offset-2 hover:ring-offset-zinc-950">
              <span className="mr-2">Start Your Journey</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-400 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
            </Link>
            <Link href="/dashboard" className="px-8 py-3 rounded-md border border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
              View Dashboard
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-zinc-950/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative p-6 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className={`p-3 w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-4 flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
