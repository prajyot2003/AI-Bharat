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
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userMessage }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        console.log("✅ Served by Google Gemini");
        return data.result;
    } catch (error) {
        console.error("❌ Gemini request failed:", error);
        throw new Error("Unable to connect to AI service. Please try again later.");
    }
}

export async function generateLearningPath(goal: string): Promise<PathNode[]> {
    try {
        const prompt = `Generate a 5-step learning path for the career goal: ${goal}. 
        Return ONLY a JSON array of objects with exactly this structure: 
        [{"title": "string", "description": "string", "type": "article", "xp": 100}]
        Do not include markdown blocks or any other text.`;

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Try to parse out the JSON string safely
        const text = data.result;
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
        console.error("❌ Gemini learning path failed:", error);
        throw new Error("Unable to generate learning path. Please try again later.");
    }
}
