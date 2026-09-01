import { prisma } from "../../lib/prisma.js";
import groq from "./groqClient.js";

function isValidInsightResult(result) {
    return result &&
        Array.isArray(result.strengths) &&
        Array.isArray(result.improvements) &&
        Array.isArray(result.recommendations) &&
        result.strengths.every(item => typeof item === "string") &&
        result.improvements.every(item => typeof item === "string") &&
        result.recommendations.every(item => typeof item === "string");
}

function buildInsightPrompt({ answers, evidenceRecords, signals, evaluation, traits }) {
    const answerBlock = answers.length > 0
        ? answers.map(answer => `  - Question ${answer.questionId}: ${answer.answer}`).join("\n")
        : "  (No answers available)";

    const evidenceBlock = evidenceRecords.length > 0
        ? evidenceRecords.map(record => `  - [${record.type}] ${record.sentence}`).join("\n")
        : "  (No evidence available)";

    const signalBlock = signals.length > 0
        ? signals.map(signal => `  - ${signal}`).join("\n")
        : "  (No signal data available)";

    const traitBlock = traits.length > 0
        ? traits.map(trait => `  - ${trait.traitName} (confidence: ${trait.confidence})`).join("\n")
        : "  (No generated traits available)";

    const scoreBlock = evaluation
        ? `Capability Index: ${evaluation.capabilityIndex}
Confidence Index: ${evaluation.confidenceIndex}
Coverage Index: ${evaluation.coverageIndex}
`
        : "Capability Index: unknown\nConfidence Index: unknown\nCoverage Index: unknown\n";

    return `You are a capability insights generator for an IECBP evaluation system.

Use the candidate's answers, extracted evidence, signal summaries, evaluation indices, and generated capability traits to produce concise, high-value insights.

Output must be valid JSON only in this exact format:
{
  "strengths": ["..."],
  "improvements": ["..."],
  "recommendations": ["..."]
}

Guidelines:
- Strengths should reflect the candidate's strongest capability behaviors.
- Improvements should identify the most critical capability gaps.
- Recommendations should be practical actions the candidate can take.
- Do not invent new traits beyond the provided trait list.
- Do not output any prose outside the JSON.
- Keep each list item short and clear.

Candidate answers:
${answerBlock}

Extracted evidence:
${evidenceBlock}

Signal summary:
${signalBlock}

Evaluation indices:
${scoreBlock}

Generated AI traits:
${traitBlock}
`;
}

function parseInsightResponse(rawResponse) {
    if (!rawResponse || typeof rawResponse !== "string") {
        throw new Error("Invalid insight response format");
    }

    let jsonString = rawResponse;
    const jsonMatch = rawResponse.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
    } else {
        const objectMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            jsonString = objectMatch[0];
        }
    }

    const parsed = JSON.parse(jsonString.trim());
    return {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
}

export async function generateCapabilityInsights(submissionId) {
    console.log("CAPABILITY INSIGHT STARTED");

    if (!submissionId || Number.isNaN(Number(submissionId))) {
        throw new Error("Invalid submissionId provided to generateCapabilityInsights");
    }

    const numericSubmissionId = Number(submissionId);

    const answers = await prisma.answer.findMany({
        where: { submissionId: numericSubmissionId },
        orderBy: { questionId: "asc" },
    });

    const answerIds = answers.map(answer => answer.id);

    const evidenceRecords = answerIds.length > 0
        ? await prisma.evidence.findMany({
            where: { responseId: { in: answerIds } },
            orderBy: { id: "asc" },
        })
        : [];

    const signals = await prisma.questionScore.findMany({
        where: { submissionId: numericSubmissionId },
        orderBy: { questionId: "asc" },
    });

    const signalSummaries = signals.map(score => {
        const summaries = [];
        if (score.understandingEvidence) summaries.push("Understanding evidence present");
        if (score.awarenessEvidence) summaries.push("Awareness evidence present");
        if (score.decisionEvidence) summaries.push("Decision evidence present");
        if (score.actionabilityEvidence) summaries.push("Actionability evidence present");
        if (score.clarityEvidence) summaries.push("Clarity evidence present");
        return summaries.join("; ") || "No detailed signal evidence available";
    });

    const evaluation = await prisma.evaluation.findFirst({
        where: { responseId: numericSubmissionId },
        orderBy: { id: "desc" },
    });

    const traits = await prisma.capabilityTrait.findMany({
        where: { submissionId: numericSubmissionId },
        orderBy: { id: "asc" },
    });

    const prompt = buildInsightPrompt({
        answers,
        evidenceRecords,
        signals: signalSummaries,
        evaluation,
        traits,
    });

    if (!groq) {
        throw new Error("Groq client not initialized");
    }

    const response = await generateWithRetry(prompt);

    console.log("CAPABILITY INSIGHT GENERATED");

    const parsed = parseInsightResponse(response.text);

    if (!isValidInsightResult(parsed)) {
        throw new Error("Invalid capability insight structure returned from Gemini");
    }

    console.log("CAPABILITY INSIGHT SUCCESS");
    console.log("CAPABILITY INSIGHT COMPLETED");

    return parsed;
}

async function generateWithRetry(prompt) {
    const models = ["openai/gpt-oss-120b", "llama-3.1-8b-instant"];
    const maxAttemptsPerModel = 3;
    let lastError;

    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
        const modelName = models[modelIndex];
        console.log("GROQ MODEL:", modelName);

        if (modelIndex > 0) {
            console.log("SWITCHING TO FALLBACK MODEL");
        }

        for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
            console.log("GROQ ATTEMPT:", attempt);
            console.log("API KEY EXISTS:", !!process.env.GROQ_API_KEY);
            console.log("MODEL:", modelName);
            try {
                const groqResponse = await groq.chat.completions.create({
                    model: modelName,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                });

                console.log("GROQ SUCCESS");
                return { text: groqResponse?.choices?.[0]?.message?.content };
            } catch (error) {
                lastError = error;
                console.error("FULL GROQ ERROR:", error);
                console.error("ERROR MESSAGE:", error?.message);
                console.error("ERROR STACK:", error?.stack);
                const errorMessage = error.message || String(error);
                const isRetryable =
                    error.status === 429 ||
                    error.status === 503 ||
                    error.status === 500 ||
                    errorMessage.includes("UNAVAILABLE");

                if (!isRetryable) {
                    console.log("GROQ FAILED");
                    throw error;
                }

                if (attempt < maxAttemptsPerModel) {
                    console.log("GROQ RETRYING...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    }

    console.log("CAPABILITY INSIGHT FAILED");
    throw lastError || new Error("All models exhausted for Capability Insight");
}
