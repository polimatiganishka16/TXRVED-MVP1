import { prisma } from "../../lib/prisma.js";
import groq from "./groqClient.js";
import { AI_TRAIT_TAXONOMY_SET } from "./aiTraitTaxonomy.js";

export async function generateAiTraits({ submissionId }) {
    console.log("AI TRAITS STARTED");
    console.log("AI TRAIT GENERATION STARTED");

    if (!submissionId || Number.isNaN(Number(submissionId))) {
        throw new Error("Invalid submissionId provided to generateAiTraits");
    }

    const numericSubmissionId = Number(submissionId);

    const evaluation = await prisma.evaluation.findFirst({
        where: { responseId: numericSubmissionId },
        orderBy: { id: "desc" },
    });

    const answers = await prisma.answer.findMany({
        where: { submissionId: numericSubmissionId },
        orderBy: { questionId: "asc" },
    });

    const answerIds = answers.map((answer) => answer.id);

    const evidenceRecords = answerIds.length > 0
        ? await prisma.evidence.findMany({
            where: { responseId: { in: answerIds } },
            orderBy: { id: "asc" },
        })
        : [];

    const aiAudit = await prisma.aIEvidenceAudit.findFirst({
        where: { submissionId: numericSubmissionId },
        orderBy: { id: "desc" },
    });

    const aiMissedEvidence = Array.isArray(aiAudit?.audit?.missedEvidence)
        ? aiAudit.audit.missedEvidence
        : [];

    const prompt = buildTraitPrompt({ evaluation, answers, evidenceRecords, aiMissedEvidence });
    console.log("AI TRAIT PROMPT CREATED");

    if (!groq) {
        throw new Error("Groq client not initialized");
    }

    const response = await generateWithRetry(prompt);

    console.log("AI TRAIT RAW RESPONSE", response?.text || "<no response text>");

    const parsed = parseTraitResponse(response?.text);
    console.log("AI TRAIT PARSED RESPONSE", parsed);

    const validatedTraits = validateTraits(parsed.traits || []);
    console.log("AI TRAIT VALIDATED", validatedTraits);
    console.log("AI TRAITS SUCCESS");
    console.log("AI TRAIT GENERATION COMPLETED");

    return {
        success: true,
        traits: validatedTraits,
    };
}

async function debugGenerateAiTraits(submissionId) {
    const result = await generateAiTraits({ submissionId });
    console.log("AI TRAIT RAW RESPONSE CHECK: done");
    console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1].endsWith("aiTraitService.js") && process.argv.length >= 3) {
    const submissionId = process.argv[2];
    debugGenerateAiTraits(submissionId).catch((error) => {
        console.error("AI TRAIT DEBUG FAILED", error);
        process.exit(1);
    });
}

function buildTraitPrompt({ evaluation, answers, evidenceRecords, aiMissedEvidence }) {
    const scoreBlock = evaluation
        ? `Evaluation scores:
  - understanding: ${evaluation.understanding}
  - awareness: ${evaluation.awareness}
  - decision: ${evaluation.decision}
  - actionability: ${evaluation.actionability}
  - clarity: ${evaluation.clarity}
  - capabilityIndex: ${evaluation.capabilityIndex}
  - confidenceIndex: ${evaluation.confidenceIndex}
  - coverageIndex: ${evaluation.coverageIndex}
`
        : "Evaluation scores: none available\n";

    const evidenceBlock = evidenceRecords.length > 0
        ? evidenceRecords.map((record) => `  - [${record.type}] ${record.sentence}`).join("\n")
        : "  (No rule-based evidence found)";

    const aiMissedBlock = aiMissedEvidence.length > 0
        ? aiMissedEvidence.map((item) => `  - Q${item.questionId} [${item.type}] ${item.sentence} (reason: ${item.reason})`).join("\n")
        : "  (No AI missed evidence found)";

    const answerBlock = answers.length > 0
        ? answers.map((answer) => `  - Question ${answer.questionId}: ${answer.answer}`).join("\n")
        : "  (No answers found)";

    return `You are an AI trait assessor. Generate capability traits for a candidate using ONLY the frozen trait taxonomy below.

Allowed traits:
- Execution Focused
- Decision Oriented
- Risk Aware
- Stakeholder Aware
- Analytical Thinker
- Strategic Thinker
- Problem Solver
- Planner
- Communicator
- Collaborative Thinker

Trait Interpretation Guide:
Execution Focused
* Strong ACTION evidence
* High actionability score

Decision Oriented
* Strong DECISION evidence
* High decision score

Risk Aware
* Strong RISK evidence
* High awareness score

Stakeholder Aware
* Strong STAKEHOLDER evidence

Analytical Thinker
* Strong CAUSE evidence
* High understanding score

Strategic Thinker
* Combination of CAUSE, RISK and DECISION evidence

Problem Solver
* Combination of CAUSE and ACTION evidence

Planner
* ACTION evidence showing planning, sequencing or execution preparation

Communicator
* High clarity score
* Clear and structured explanations

Collaborative Thinker
* Stakeholder consideration combined with communication evidence

Additional Generation Rules:
* Generate a maximum of 5 traits.
* Do not generate traits with confidence below 0.60.
* Use ONLY traits from the frozen taxonomy.
* Do not invent new traits.
* Every generated trait must be supported by evidence.
* If insufficient evidence exists, omit the trait.

Important:
- Use ONLY traits from the allowed list.
- Do NOT invent any additional traits.
- Generate traits based on the provided evaluation scores, rule-based evidence, and AI missed evidence audit.
- Provide a confidence score between 0 and 1 for each selected trait.
- Provide supporting evidence objects for each trait.
- Return ONLY valid JSON and nothing else.

${scoreBlock}
Candidate answers:
${answerBlock}

Rule-based evidence:
${evidenceBlock}

AI missed evidence audit:
${aiMissedBlock}

Return JSON in this exact format:
{
  "traits": [
    {
      "traitName": "Decision Oriented",
      "confidence": 0.82,
      "evidence": [
        {
          "source": "Evidence",
          "type": "DECISION",
          "text": "candidate selected option B"
        }
      ]
    }
  ]
}
`;
}

function parseTraitResponse(rawResponse) {
    try {
        if (!rawResponse || typeof rawResponse !== "string") {
            throw new Error("Invalid response format");
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
            traits: Array.isArray(parsed.traits) ? parsed.traits : [],
        };
    } catch (error) {
        console.error("AI TRAIT PARSE ERROR:", error.message);
        return { traits: [] };
    }
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

    console.log("AI TRAITS FAILED");
    throw lastError || new Error("All models exhausted for AI Traits");
}

function validateTraits(traits) {
    const seen = new Set();
    const validated = [];

    for (const item of traits) {
        const traitName = typeof item?.traitName === "string" ? item.traitName : null;
        const confidence = typeof item?.confidence === "number" ? item.confidence : null;
        const evidence = Array.isArray(item?.evidence) ? item.evidence : null;

        const errors = [];

        if (!traitName || !AI_TRAIT_TAXONOMY_SET.has(traitName)) {
            errors.push("invalid or unknown traitName");
        }

        if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
            errors.push("confidence must be a number between 0 and 1");
        } else if (confidence < 0.6) {
            errors.push("confidence below minimum threshold 0.60");
        }

        if (!Array.isArray(evidence) || evidence.length === 0) {
            errors.push("evidence must be a non-empty array");
        }

        if (errors.length > 0) {
            console.warn("AI TRAIT VALIDATION FAILED", {
                traitName,
                confidence,
                evidence,
                reasons: errors,
            });
            continue;
        }

        const filteredEvidence = evidence.filter((item) => {
            return item &&
                typeof item.source === "string" && item.source.trim().length > 0 &&
                typeof item.type === "string" &&
                ["CAUSE", "DECISION", "RISK", "STAKEHOLDER", "ACTION"].includes(item.type) &&
                typeof item.text === "string" && item.text.trim().length > 0;
        });

        if (filteredEvidence.length === 0) {
            console.warn("AI TRAIT VALIDATION FAILED", {
                traitName,
                confidence,
                evidence,
                reasons: ["evidence entries must include valid source, type, and text"],
            });
            continue;
        }

        if (seen.has(traitName)) {
            console.warn("AI TRAIT VALIDATION FAILED", {
                traitName,
                confidence,
                evidence,
                reasons: ["duplicate trait removed"],
            });
            continue;
        }

        seen.add(traitName);

        validated.push({
            traitName,
            confidence,
            evidence: filteredEvidence,
        });

        if (validated.length >= 5) {
            break;
        }
    }

    return validated;
}
