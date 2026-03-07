export type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
};

export interface PathNode {
    id: string;
    title: string;
    description: string;
    type: "video" | "article" | "project" | "quiz";
    status: "locked" | "unlocked" | "completed";
    xp: number;
}

export async function generateAIResponse(userMessage: string, history: Message[] = []): Promise<string> {
    try {
        const messages = history.map(msg => ({ role: msg.role, content: msg.content }));
        messages.push({ role: "user", content: userMessage });

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model: "openai" }),
        });

        if (!response.ok) throw new Error("API responded with an error");

        const text = await response.text();
        console.log("✅ Served by Free Pollinations.ai API");
        return text;
    } catch (error) {
        console.error("❌ Free AI request failed:", error);
        throw new Error("Unable to connect to AI service. Please try again later.");
    }
}

export async function generateLearningPath(goal: string): Promise<PathNode[]> {
    try {
        const prompt = `Generate a 5-step learning path for the career goal: ${goal}. 
        Return ONLY a JSON array of objects with exactly this structure: 
        [{"title": "string", "description": "string", "type": "article", "xp": 100}]
        Do not include markdown blocks or any other text.`;

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: "openai"
            }),
        });

        if (!response.ok) throw new Error("API responded with an error");

        // Try to parse out the JSON string safely
        const text = await response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        let steps = [];
        if (jsonMatch) {
            steps = JSON.parse(jsonMatch[0]);
        } else {
            steps = JSON.parse(text);
        }

        return steps.map((s: any, i: number) => ({
            id: Math.random().toString(36).substring(7),
            title: s.title || `Step ${i + 1}`,
            description: s.description || '',
            type: s.type || 'article',
            status: i === 0 ? 'unlocked' : 'locked',
            xp: s.xp || 100,
        }));
    } catch (error) {
        console.error("❌ Free AI learning path failed:", error);
        throw new Error("Unable to generate learning path. Please try again later.");
    }
}
