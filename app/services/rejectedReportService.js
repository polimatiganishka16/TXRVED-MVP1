import { prisma } from "../../lib/prisma.js";

/**
 * generateRejectedReportInsights
 * 
 * Generates focused improvement-oriented insights for REJECTED reports.
 * Based on lower-scoring capabilities and weaker evaluation signals.
 * 
 * @param {number} submissionId - The submission ID
 * @returns {object} - { improvements, strengths, recommendations }
 */
export async function generateRejectedReportInsights(submissionId) {
  console.log("GENERATING REJECTED REPORT INSIGHTS");

  const numericSubmissionId = Number(submissionId);

  // Get evaluation data
  const evaluation = await prisma.evaluation.findFirst({
    where: { responseId: numericSubmissionId },
    orderBy: { id: "desc" },
  });

  if (!evaluation) {
    throw new Error("No evaluation data found for this submission");
  }

  // Get question scores to identify weak areas
  const questionScores = await prisma.questionScore.findMany({
    where: { submissionId: numericSubmissionId },
    orderBy: { questionId: "asc" },
  });

  // Get capabilities to understand what was demonstrated
  const capabilityTraits = await prisma.capabilityTrait.findMany({
    where: { submissionId: numericSubmissionId },
    orderBy: { id: "asc" },
  });

  // Get answers to provide context
  const answers = await prisma.answer.findMany({
    where: { submissionId: numericSubmissionId },
    orderBy: { questionId: "asc" },
  });

  // Classify signal strength
  function classifySignalLevel(score) {
    if (score >= 80) return "strong";
    if (score >= 60) return "moderate";
    return "weak";
  }

  // Identify weak signals from evaluation
  const weakSignals = [];
  const signalMap = {
    understanding: evaluation.understanding,
    awareness: evaluation.awareness,
    decision: evaluation.decision,
    actionability: evaluation.actionability,
    clarity: evaluation.clarity,
  };

  const signalThresholds = {
    strong: 75,
    moderate: 50,
    weak: 0,
  };

  for (const [signalName, score] of Object.entries(signalMap)) {
    const level = classifySignalLevel(score);
    if (level === "weak") {
      weakSignals.push({
        name: signalName,
        score,
        level: "weak",
      });
    } else if (level === "moderate") {
      weakSignals.push({
        name: signalName,
        score,
        level: "moderate",
      });
    }
  }

  // Identify weak question responses
  const weakQuestions = questionScores
    .filter((qs) => qs.score < 2.5) // Out of 5, less than 2.5 is weak
    .sort((a, b) => a.score - b.score)
    .slice(0, 3); // Top 3 weakest

  // Build focused improvements list
  const improvements = [];

  // From weak signals
  if (
    signalMap.understanding < 75 ||
    signalMap.clarity < 75 ||
    signalMap.awareness < 75 ||
    signalMap.decision < 75
  ) {
    if (signalMap.clarity < 75) {
      improvements.push(
        "Enhance clarity in explanations and structured reasoning for complex scenarios"
      );
    }
    if (signalMap.understanding < 75) {
      improvements.push(
        "Deepen conceptual understanding of core scenario principles and underlying causes"
      );
    }
    if (signalMap.awareness < 75) {
      improvements.push(
        "Improve awareness of risks, stakeholder impacts, and unintended consequences"
      );
    }
    if (signalMap.decision < 75) {
      improvements.push(
        "Strengthen decision-making process with better prioritization and justification"
      );
    }
  }

  // From weak questions
  weakQuestions.forEach((wq) => {
    if (!improvements.includes(`Question ${wq.questionId}: needs stronger reasoning`)) {
      improvements.push(`Question ${wq.questionId}: Provide more thorough analysis and evidence`);
    }
  });

  // Limit to reasonable number and deduplicate
  const uniqueImprovements = [...new Set(improvements)].slice(0, 5);

  // Build strengths - only from demonstrated traits, minimal list for rejected
  const strengths = [];
  if (capabilityTraits.length > 0) {
    // Only include traits with high confidence
    const highConfidenceTraits = capabilityTraits.filter(
      (t) => t.confidence >= 0.7
    );
    if (highConfidenceTraits.length > 0) {
      strengths.push(
        `Demonstrated capability in: ${highConfidenceTraits
          .slice(0, 2)
          .map((t) => t.traitName)
          .join(", ")}`
      );
    }
  }

  // If no high-confidence traits, provide minimal generic strength
  if (strengths.length === 0) {
    strengths.push("Submitted comprehensive responses across all questions");
  }

  // Build recommendations - focused on improvement areas
  const recommendations = [];

  const weakestSignal = weakSignals.sort((a, b) => a.score - b.score)[0];

  // Generate targeted recommendations based on specific weak areas
  if (weakestSignal?.name === "clarity") {
    recommendations.push(
      "Structure responses with clear cause-and-effect relationships. Start with the main consideration, then explain supporting reasoning and expected outcomes."
    );
  }

  if (weakestSignal?.name === "understanding") {
    recommendations.push(
      "Review scenario fundamentals and industry standards for this domain. Ensure your responses reflect deeper comprehension of the business context and technical implications."
    );
  }

  if (weakestSignal?.name === "awareness") {
    recommendations.push(
      "Systematically identify and document all stakeholders affected by your decisions. Consider both direct and indirect consequences, including risks and mitigation strategies."
    );
  }

  if (weakestSignal?.name === "decision") {
    recommendations.push(
      "Develop a structured decision-making framework. Identify evaluation criteria, weigh options against these criteria, and clearly justify your chosen path."
    );
  }

  // Add a second generic recommendation
  if (recommendations.length < 2) {
    recommendations.push(
      "Review evaluator remarks for specific feedback on your submission. Consider working with a mentor or peer to discuss alternative approaches to similar scenarios."
    );
  }

  // Add a third recommendation for continuous improvement
  if (recommendations.length < 3) {
    recommendations.push(
      "Practice with additional scenarios in this domain. Focus on detailed analysis and evidence-based reasoning for each response."
    );
  }

  console.log("REJECTED REPORT INSIGHTS GENERATED");

  return {
    strengths: strengths.slice(0, 2), // Minimal strengths for rejected
    improvements: uniqueImprovements,
    recommendations: recommendations.slice(0, 4),
  };
}
