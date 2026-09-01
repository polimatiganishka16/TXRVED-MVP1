import { prisma } from "../../lib/prisma.js";
import groq from "./groqClient.js";

const EVIDENCE_TYPES = ["CAUSE", "DECISION", "RISK", "STAKEHOLDER", "ACTION"];

/**
 * Audits candidate answers for missed evidence using Gemini AI.
 *
 * @param {number} submissionId - The submission ID to audit
 * @returns {Promise<Object>} { success: boolean, missedEvidence: Array, error?: string }
 */
export async function auditEvidenceGaps(submissionId) {
    console.log("AI EVIDENCE AUDIT STARTED");

    try {
        // Validate input
        if (!submissionId || Number.isNaN(Number(submissionId))) {
            throw new Error("Invalid submissionId provided to auditEvidenceGaps");
        }

        // FETCH: All answers for this submission
        const answers = await prisma.answer.findMany({
            where: { submissionId: Number(submissionId) }
        });

        if (answers.length === 0) {
            console.log("AI EVIDENCE AUDIT: No answers found for submission");
            return {
                success: true,
                missedEvidence: []
            };
        }

        // FETCH: All evidence linked to these answers (Evidence.responseId = Answer.id)
        const answerIds = answers.map(a => a.id);
        const existingEvidence = await prisma.evidence.findMany({
            where: { responseId: { in: answerIds } }
        });

        // Build evidence map: answerId -> array of evidence records
        const evidenceByAnswerId = new Map();
        for (const answer of answers) {
            evidenceByAnswerId.set(answer.id, []);
        }
        for (const evidence of existingEvidence) {
            const records = evidenceByAnswerId.get(evidence.responseId) || [];
            records.push({
                type: evidence.type,
                keyword: evidence.keyword,
                sentence: evidence.sentence
            });
            evidenceByAnswerId.set(evidence.responseId, records);
        }

        // BUILD: Structured payload for Gemini
        const answerPayload = answers.map(answer => ({
            questionId: answer.questionId,
            answer: answer.answer,
            existingEvidence: evidenceByAnswerId.get(answer.id) || []
        }));

        // BUILD: Audit prompt
        const auditPrompt = buildAuditPrompt(answerPayload);
        console.log("AI EVIDENCE AUDIT PROMPT CREATED");

        // CALL: Groq with model fallback
        if (!groq) {
            throw new Error("Groq client not initialized");
        }

        let response;
        let lastError;
        const models = ["openai/gpt-oss-120b", "llama-3.1-8b-instant"];
        const maxAttemptsPerModel = 3;

        for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
            const currentModel = models[modelIndex];

            // Log model selection
            if (modelIndex === 0) {
                console.log("GROQ MODEL:", currentModel);
            } else {
                console.log("SWITCHING TO FALLBACK MODEL");
                console.log("GROQ MODEL:", currentModel);
            }

            // Try current model up to maxAttemptsPerModel times
            for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
                try {
                    console.log("GROQ ATTEMPT:", attempt);
                    console.log("API KEY EXISTS:", !!process.env.GROQ_API_KEY);
                    console.log("MODEL:", currentModel);
                    console.log("PROMPT LENGTH:", auditPrompt.length);

                    const groqResponse = await groq.chat.completions.create({
                        model: currentModel,
                        messages: [
                            {
                                role: "user",
                                content: auditPrompt,
                            },
                        ],
                        temperature: 0.3,
                    });

                    // Normalize to previous shape (text) for existing parsing
                    response = { text: groqResponse?.choices?.[0]?.message?.content };

                    console.log("GROQ SUCCESS");
                    break; // Success - break attempt loop
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

                    // Non-retryable errors throw immediately
                    if (!isRetryable) {
                        console.log("GROQ FAILED");
                        throw error;
                    }

                    // Retryable errors: retry if attempts remaining
                    if (attempt < maxAttemptsPerModel) {
                        console.log("GROQ RETRYING...");
                        // Wait 2 seconds before retry
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    // If last attempt of this model, loop will continue to next model
                }
            }

            // If successful with current model, exit model loop
            if (response) {
                break;
            }
        }

        // If no model succeeded, fail with error
        if (!response) {
            console.log("GROQ FAILED AFTER ALL RETRIES");
            throw lastError || new Error("All models exhausted");
        }

        const rawResponse = response.text;
        console.log("AI EVIDENCE AUDIT RAW RESPONSE");

        // PARSE: JSON response safely
        const parsedResponse = parseAuditResponse(rawResponse);
        console.log("AI EVIDENCE AUDIT PARSED RESPONSE");

        return {
            success: true,
            missedEvidence: parsedResponse.missedEvidence
        };
    } catch (error) {
        console.error("AI EVIDENCE AUDIT ERROR:", error.message);
        return {
            success: false,
            missedEvidence: [],
            error: error.message
        };
    }
}

/**
 * Builds the audit prompt for Gemini with structured answer and evidence data.
 *
 * @param {Array} answerPayload - Array of { questionId, answer, existingEvidence }
 * @returns {string} Formatted prompt for Gemini
 */
function buildAuditPrompt(answerPayload) {
    let prompt = `You are an evidence auditor for a competency assessment system. Review the following candidate answers and their existing evidence records.

Your task: Identify any potentially missed evidence that the rule-based engine may have overlooked.

Allowed evidence types:
- CAUSE: Statements explaining why something happened or exists
- DECISION: Statements showing decision-making, choices, or prioritization
- RISK: Statements identifying risks, impacts, issues, or challenges
- STAKEHOLDER: Statements mentioning or considering stakeholders
- ACTION: Statements describing actions, implementations, or monitoring

Review carefully and identify clear instances of missed evidence. Be conservative.

Return ONLY valid JSON in this exact format:
{
  "missedEvidence": [
    {
      "questionId": 1,
      "type": "STAKEHOLDER",
      "sentence": "exact sentence from the answer",
      "reason": "brief explanation"
    }
  ]
}

No text outside JSON. No scoring. No traits. Only missed evidence.

===== ANSWERS AND EXISTING EVIDENCE =====

`;

    for (const item of answerPayload) {
        prompt += `\nQuestion ${item.questionId}:\n`;
        prompt += `Candidate Answer: "${item.answer}"\n\n`;
        prompt += `Existing Evidence Found:\n`;

        if (item.existingEvidence && item.existingEvidence.length > 0) {
            for (const evidence of item.existingEvidence) {
                prompt += `  - [${evidence.type}] keyword: "${evidence.keyword}" -> "${evidence.sentence}"\n`;
            }
        } else {
            prompt += `  (None)\n`;
        }

        prompt += `\n`;
    }

    prompt += `\n===== END ANSWERS =====\n\nReturn only the JSON with missed evidence.`;

    return prompt;
}

/**
 * Safely parses Gemini's JSON response.
 *
 * @param {string} rawResponse - Raw text response from Gemini
 * @returns {Object} { missedEvidence: Array }
 */
function parseAuditResponse(rawResponse) {
    try {
        if (!rawResponse || typeof rawResponse !== "string") {
            throw new Error("Invalid response format");
        }

        // Extract JSON: try markdown code block first
        let jsonString = rawResponse;
        const jsonMatch = rawResponse.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1];
        } else {
            // Try to extract raw JSON object
            const objectMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                jsonString = objectMatch[0];
            }
        }

        const parsed = JSON.parse(jsonString.trim());

        // Validate structure
        if (!Array.isArray(parsed.missedEvidence)) {
            console.warn("AI EVIDENCE AUDIT: Response missing missedEvidence array");
            return { missedEvidence: [] };
        }

        // Validate and filter each evidence record
        const validated = parsed.missedEvidence.filter(item => {
            const isValid =
                Number.isInteger(item.questionId) &&
                typeof item.type === "string" &&
                EVIDENCE_TYPES.includes(item.type) &&
                typeof item.sentence === "string" &&
                item.sentence.trim().length > 0 &&
                typeof item.reason === "string" &&
                item.reason.trim().length > 0;

            if (!isValid) {
                console.warn("AI EVIDENCE AUDIT: Skipping invalid evidence record", item);
            }

            return isValid;
        });

        return { missedEvidence: validated };
    } catch (error) {
        console.error("AI EVIDENCE AUDIT: JSON parse failed:", error.message);
        return { missedEvidence: [] };
    }
}