import { NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const ollamaUrl = "http://127.0.0.1:11434/api/chat";

        const response = await fetch(ollamaUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Ollama unavailable" }, { status: 503 });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
