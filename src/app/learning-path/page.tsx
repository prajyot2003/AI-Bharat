"use client";

import { useState } from "react";
import { PathGeneratorForm } from "@/components/features/PathGeneratorForm";
import { PathVisualizer } from "@/components/features/PathVisualizer";
import { generateLearningPath, PathNode } from "@/lib/mock-ai";

export default function LearningPathPage() {
    const [generatedGoal, setGeneratedGoal] = useState<string | null>(null);
    const [generatedPath, setGeneratedPath] = useState<PathNode[] | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async (data: { goal: string }) => {
        setLoading(true);
        const path = await generateLearningPath(data.goal);
        setGeneratedGoal(data.goal);
        setGeneratedPath(path);
        setLoading(false);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {!generatedGoal || !generatedPath ? (
                <PathGeneratorForm onGenerate={handleGenerate} isLoading={loading} />
            ) : (
                <PathVisualizer goal={generatedGoal} initialPath={generatedPath} />
            )}
        </div>
    );
}
