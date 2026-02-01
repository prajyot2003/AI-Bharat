import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache for 1 hour

const REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs?limit=50";

export async function GET() {
    try {
        const response = await fetch(REMOTIVE_API_URL);
        if (!response.ok) throw new Error("Failed to fetch Remotive jobs");

        const data = await response.json();
        const items = data.jobs || [];

        // Define trend keywords to track
        // Remotive has a 'tags' array, which makes this even easier!
        const trendKeywords: Record<string, number> = {
            "React": 0,
            "Next.js": 0,
            "TypeScript": 0,
            "Python": 0,
            "AI": 0,
            "Machine Learning": 0,
            "DevOps": 0,
            "Design": 0,
            "Go": 0,
            "Rust": 0,
            "Java": 0,
            "Cloud": 0
        };

        const processedJobs = items.map((item: any) => {
            // Count trends from tags
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach((tag: string) => {
                    // Match against our keywords loosely
                    Object.keys(trendKeywords).forEach(key => {
                        if (tag.toLowerCase().includes(key.toLowerCase())) {
                            trendKeywords[key]++;
                        }
                    });
                });
            }

            // Also check title/description if tags miss it
            const fullText = `${item.title} ${item.description || ""}`;
            Object.keys(trendKeywords).forEach(key => {
                if (new RegExp(`\\b${key}\\b`, 'i').test(fullText)) {
                    // Only increment if not already counted by tags? 
                    // Simplifying: A rough count is fine for trends
                    trendKeywords[key]++;
                }
            });

            return {
                id: item.id.toString(),
                role: item.title,
                company: item.company_name,
                location: item.candidate_required_location || "Remote",
                type: item.job_type || "Full-time",
                link: item.url,
                // Clean HTML from description for snippet? Remotive returns HTML.
                // We'll just take the plain text or letting the frontend strip it?
                // Frontend 'analyze' needs text. We'll strip tags here for safety/size.
                description: (item.description || "").replace(/<[^>]*>?/gm, "").substring(0, 300) + "...",
                pubDate: item.publication_date
            };
        });

        // Normalize Trend Counts
        // Since we double count (tags + text), let's divide by a factor or just map to relative scale
        const maxCount = Math.max(...Object.values(trendKeywords)) || 1;

        const trends = Object.entries(trendKeywords)
            .map(([skill, count]) => {
                // Mocking a "Growth" percentage based on relative frequency in this batch
                const prominence = Math.round((count / maxCount) * 100);

                // Add some randomness to simulate "Growth" vs "Presence"
                // Or just use the prominence as "Market Share"

                let demand = "Stable";
                let color = "bg-blue-500";

                if (prominence > 80) { demand = "Exploding"; color = "bg-purple-500"; }
                else if (prominence > 50) { demand = "Very High"; color = "bg-emerald-500"; }
                else if (prominence > 30) { demand = "High"; color = "bg-cyan-500"; }

                return { skill, growth: prominence, demand, color };
            })
            .sort((a, b) => b.growth - a.growth)
            .slice(0, 4);

        return NextResponse.json({ jobs: processedJobs, trends });

    } catch (error) {
        console.error("Job Fetch Error:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}
