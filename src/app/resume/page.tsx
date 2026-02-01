"use client";

import { useState, useRef } from "react";
import { ResumePreview, type ResumeData } from "@/components/features/ResumePreview";
import { Printer, Download, Sparkles, Loader2, Wand2 } from "lucide-react";
import { generateAIResponse } from "@/lib/mock-ai";

export default function ResumeBuilderPage() {
    const [data, setData] = useState<ResumeData>({
        fullName: "",
        role: "",
        email: "",
        phone: "",
        summary: "",
        skills: "",
        experience: "",
        education: ""
    });

    const [isEnhancing, setIsEnhancing] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const updateField = (field: keyof ResumeData, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleEnhance = async () => {
        if (!data.summary && !data.experience) return;
        setIsEnhancing(true);

        try {
            const prompt = `Enhance this resume content to be more professional, impactful, and ATS-friendly. 
            Focus on strong action verbs and concise phrasing.
            
            Current Role: ${data.role}
            Summary: ${data.summary}
            Experience: ${data.experience}
            
            Return a JSON object with two fields: "summary" and "experience" containing the improved versions. 
            Do not include any other text.`;

            // Note: Our current AI service returns a string. We might need to parse it if we asked for JSON.
            // Or we can just ask it to return the text and we manually paste it? 
            // Let's try to get a structured response by asking for JSON and parsing it, 
            // similar to the Learning Path generator but simpler.
            // However, generateAIResponse is simple. Let's send a specific instruction.

            // To keep it robust using the generic chat model:
            // We'll ask for specific marked sections.
            const enhancedContent = await generateAIResponse(`
                Rewrite the following resume sections to be professional and impactful.
                
                [SUMMARY START]
                ${data.summary}
                [SUMMARY END]

                [EXPERIENCE START]
                ${data.experience}
                [EXPERIENCE END]

                Return ONLY the rewritten content wrapped in the tags above.
            `);

            // Parse response
            const summaryMatch = enhancedContent.match(/\[SUMMARY START\]([\s\S]*?)\[SUMMARY END\]/);
            const expMatch = enhancedContent.match(/\[EXPERIENCE START\]([\s\S]*?)\[EXPERIENCE END\]/);

            if (summaryMatch && summaryMatch[1]) {
                updateField("summary", summaryMatch[1].trim());
            }
            if (expMatch && expMatch[1]) {
                updateField("experience", expMatch[1].trim());
            }

        } catch (error) {
            console.error("Enhancement failed", error);
        } finally {
            setIsEnhancing(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Editor Form */}
                <div className="w-full lg:w-1/3 bg-zinc-900/80 p-6 rounded-2xl border border-white/10 h-fit sticky top-20 overflow-y-auto max-h-[85vh] print:hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-white">Editor</h1>
                            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-1 rounded">Markdown Supported</span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleEnhance}
                                disabled={isEnhancing}
                                className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
                                title="Enhance with AI"
                            >
                                {isEnhancing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                    AI Fix
                                </span>
                            </button>
                            <button onClick={handlePrint} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors" title="Print / Save PDF">
                                <Printer className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Full Name</label>
                            <input
                                value={data.fullName}
                                onChange={e => updateField("fullName", e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Target Role</label>
                            <input
                                value={data.role}
                                onChange={e => updateField("role", e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                placeholder="Software Engineer"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Email</label>
                                <input
                                    value={data.email}
                                    onChange={e => updateField("email", e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Phone</label>
                                <input
                                    value={data.phone}
                                    onChange={e => updateField("phone", e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs uppercase text-zinc-500 font-bold">Summary</label>
                                {isEnhancing && <span className="text-xs text-purple-400 animate-pulse">Polishing...</span>}
                            </div>
                            <textarea
                                value={data.summary}
                                onChange={e => updateField("summary", e.target.value)}
                                rows={4}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none resize-none focus:border-purple-500/50 transition-colors"
                                placeholder="Brief overview of your career..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Skills (comma separated)</label>
                            <input
                                value={data.skills}
                                onChange={e => updateField("skills", e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none"
                                placeholder="Python, React, Design..."
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs uppercase text-zinc-500 font-bold">Experience</label>
                                {isEnhancing && <span className="text-xs text-purple-400 animate-pulse">Improving...</span>}
                            </div>
                            <textarea
                                value={data.experience}
                                onChange={e => updateField("experience", e.target.value)}
                                rows={8}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none resize-y focus:border-purple-500/50 transition-colors"
                                placeholder="Company Name - Role&#10;Date - Date&#10;• Achievements..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Education</label>
                            <textarea
                                value={data.education}
                                onChange={e => updateField("education", e.target.value)}
                                rows={3}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="flex-1 bg-zinc-800/50 p-4 md:p-8 rounded-2xl flex justify-center overflow-auto print:bg-white print:p-0 print:m-0 print:rounded-none overflow-hidden sm:overflow-visible">
                    <div className="print:w-full print:absolute print:top-0 print:left-0 print:m-0">
                        <ResumePreview data={data} />
                    </div>
                </div>
            </div>
        </div>
    );
}
