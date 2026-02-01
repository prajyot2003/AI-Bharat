export type ResumeData = {
    fullName: string;
    role: string;
    email: string;
    phone: string;
    summary: string;
    skills: string;
    experience: string;
    education: string;
};

export function ResumePreview({ data }: { data: ResumeData }) {
    return (
        <div id="resume-preview" className="bg-white text-black p-8 min-h-[297mm] w-full max-w-[210mm] mx-auto shadow-2xl origin-top scale-[0.6] sm:scale-[0.8] md:scale-100 transition-transform">
            <div className="border-b-2 border-zinc-800 pb-4 mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-wider">{data.fullName || "Your Name"}</h1>
                <p className="text-lg text-zinc-600 font-medium">{data.role || "Professional Role"}</p>
                <div className="flex gap-4 mt-2 text-sm text-zinc-500">
                    <span>{data.email || "email@example.com"}</span>
                    {data.phone && <span>• {data.phone}</span>}
                </div>
            </div>

            <div className="space-y-6">
                <section>
                    <h2 className="text-lg font-bold uppercase border-b border-zinc-300 mb-2">Summary</h2>
                    <p className="text-sm leading-relaxed">{data.summary || "A brief summary of your professional background and goals."}</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold uppercase border-b border-zinc-300 mb-2">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                        {data.skills ? data.skills.split(",").map(skill => (
                            <span key={skill} className="px-2 py-1 bg-zinc-100 text-xs font-semibold rounded">{skill.trim()}</span>
                        )) : <span className="text-zinc-400 italic">List your skills...</span>}
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-bold uppercase border-b border-zinc-300 mb-2">Experience</h2>
                    <div className="whitespace-pre-wrap text-sm">{data.experience || "Your work experience here..."}</div>
                </section>

                <section>
                    <h2 className="text-lg font-bold uppercase border-b border-zinc-300 mb-2">Education</h2>
                    <div className="whitespace-pre-wrap text-sm">{data.education || "University - Degree - Year"}</div>
                </section>
            </div>
        </div>
    );
}
