import {
    sendChatMessage,
    generateLearningPath as generateLearningPathAWS,
} from './ai-service-client';

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
        const result = await sendChatMessage({ message: userMessage });
        console.log("✅ Served by AWS Bedrock");
        return result.content;
    } catch (error) {
        console.error("❌ AWS Bedrock chat request failed:", error);
        throw new Error("Unable to connect to AI service. Please try again later.");
    }
}

export async function generateLearningPath(goal: string): Promise<PathNode[]> {
    try {
        const result = await generateLearningPathAWS({
            userId: 'anonymous',
            targetRole: goal,
        });

        if (result.steps && Array.isArray(result.steps)) {
            return result.steps.map((s: any) => ({
                id: s.id || Math.random().toString(36).substring(7),
                title: s.title || 'Learning Step',
                description: s.description || '',
                type: s.type || 'article',
                status: s.status || 'locked',
                xp: s.xp || 100,
            }));
        }

        throw new Error("Invalid response format from AI service");
    } catch (error) {
        console.error("❌ AWS Bedrock learning path failed:", error);
        throw new Error("Unable to generate learning path. Please try again later.");
    }
}
