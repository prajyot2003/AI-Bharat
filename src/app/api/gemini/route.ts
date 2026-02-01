import { NextResponse } from "next/server";

export const maxDuration = 60; // 1 minute (Gemini is fast)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, systemPrompt, jsonMode } = body;

        // Convert OpenAI-style messages to Gemini format
        // OpenAI: [{role: "user", content: "..."}]
        // Gemini: [{role: "user", parts: [{text: "..."}]}]
        // Note: Gemini roles are "user" and "model".

        const contents = messages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
        }));

        // If there's a system prompt, we can prepend it or use systemInstruction if the model supports it.
        // For simplicity with Flash, prepending to context or using systemInstruction object.

        const payload: any = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
            }
        };

        if (systemPrompt) {
            payload.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        if (jsonMode) {
            payload.generationConfig.responseMimeType = "application/json";
        }

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            return NextResponse.json({ error: "Gemini API Error", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        // Extract text from Gemini response structure
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return NextResponse.json({ content: generatedText });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
