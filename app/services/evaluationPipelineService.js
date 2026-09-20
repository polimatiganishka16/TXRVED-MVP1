const { PrismaClient } = require('@prisma/client');
const { redis } = require('../../lib/redis');
const { evaluateSubmission } = require('../../evaluation/evaluationEngine');

const prisma = new PrismaClient();

async function runEvaluationPipeline({ submissionId, scenarioId }) {
  const numericSubmissionId = Number(submissionId);
  const numericScenarioId = Number(scenarioId);

  if (!Number.isInteger(numericSubmissionId) || numericSubmissionId <= 0) {
    throw new Error('Invalid submissionId provided to evaluation pipeline');
  }

  const submission = await prisma.submission.findUnique({
    where: { id: numericSubmissionId },
    include: {
      candidate: true,
      attempt: { include: { candidate: true } },
    },
  });

  if (!submission) {
    throw new Error(`Submission ${numericSubmissionId} not found`);
  }

  const dbAnswers = await prisma.answer.findMany({
    where: { submissionId: numericSubmissionId },
  });

  const attemptId = submission.attemptId ?? null;
  const effectiveScenarioId = Number(submission.scenarioId ?? numericScenarioId);

  const scenarioQuestions = await prisma.question.findMany({
    where: { scenarioId: effectiveScenarioId },
    select: { id: true, orderNo: true, questionText: true, questionType: true },
    orderBy: { orderNo: 'asc' },
  });

  const questionIdToOrderNo = new Map(
    scenarioQuestions.map((question) => [Number(question.id), Number(question.orderNo)])
  );
  const orderNoToQuestionId = new Map(
    scenarioQuestions.map((question) => [Number(question.orderNo), Number(question.id)])
  );

  const { extractEvidence } = await import('./evidenceService.js');
  const evidenceSummary = await extractEvidence(numericSubmissionId);

  const evidenceRecords = await prisma.evidence.findMany({
    where: { responseId: { in: dbAnswers.map((answer) => answer.id) } },
  });

  const evidenceByQuestionId = new Map();
  for (const answer of dbAnswers) evidenceByQuestionId.set(answer.questionId, []);
  for (const record of evidenceRecords) {
    const answer = dbAnswers.find((item) => item.id === record.responseId);
    if (!answer) continue;
    const items = evidenceByQuestionId.get(answer.questionId) || [];
    const duplicate = items.some((item) => item.type === record.type && item.keyword === record.keyword && item.sentence === record.sentence);
    if (!duplicate) items.push({ type: record.type, keyword: record.keyword, sentence: record.sentence });
    evidenceByQuestionId.set(answer.questionId, items);
  }

  const { generateSignals } = await import('./signalService.js');
  const signals = await generateSignals(numericSubmissionId);

  const { calculateScores } = await import('./scoringService.js');
  const scores = calculateScores({
    understanding: signals.understanding,
    awareness: signals.awareness,
    decision: signals.decision,
    actionability: signals.actionability,
    clarity: signals.clarity,
    evidenceCounts: evidenceSummary,
  });

  const formattedAnswers = dbAnswers.map((answer) => {
    const dbQuestionId = Number(answer.questionId);
    const questionOrderNo = questionIdToOrderNo.get(dbQuestionId) ?? Number(String(answer.questionId).replace(/^q/i, ''));
    return { questionId: `q${questionOrderNo}`, answer: answer.answer };
  });

  const result = await evaluateSubmission(effectiveScenarioId, formattedAnswers);

  await prisma.evaluation.deleteMany({ where: { responseId: numericSubmissionId } });
  const saved = await prisma.evaluation.create({
    data: {
      responseId: numericSubmissionId,
      understanding: signals.understanding,
      clarity: signals.clarity,
      awareness: signals.awareness,
      decision: signals.decision,
      actionability: signals.actionability,
      capabilityIndex: scores.capabilityIndex,
      confidenceIndex: scores.confidenceIndex,
      coverageIndex: scores.coverageIndex,
    },
  });

  const questionScoreData = result.evaluatedQuestions.map((question) => {
    const questionOrderNo = Number(String(question.questionId).replace(/^q/i, ''));
    const dbQuestionId = orderNoToQuestionId.get(questionOrderNo) ?? questionOrderNo;
    const questionEvidence = evidenceByQuestionId.get(dbQuestionId) || evidenceByQuestionId.get(questionOrderNo) || [];
    const answerText = typeof question.rawAnswer === 'string' ? question.rawAnswer : JSON.stringify(question.rawAnswer);
    return {
      submissionId: numericSubmissionId,
      attemptId,
      questionId: dbQuestionId,
      score: question.score,
      understandingEvidence: questionEvidence.filter((item) => item.type === 'CAUSE' || item.type === 'STAKEHOLDER'),
      awarenessEvidence: questionEvidence.filter((item) => item.type === 'RISK' || item.type === 'STAKEHOLDER'),
      decisionEvidence: questionEvidence.filter((item) => item.type === 'DECISION'),
      actionabilityEvidence: questionEvidence.filter((item) => item.type === 'ACTION'),
      clarityEvidence: [{ wordCount: answerText.trim().split(/\s+/).filter(Boolean).length, excerpt: answerText.slice(0, 120) }],
    };
  });

  await prisma.questionScore.deleteMany({ where: { submissionId: numericSubmissionId } });
  await prisma.questionScore.createMany({ data: questionScoreData });

  const { auditEvidenceGaps } = await import('./aiEvidenceAuditService.js');
  const auditResult = await auditEvidenceGaps(numericSubmissionId);
  await prisma.aIEvidenceAudit.deleteMany({ where: { submissionId: numericSubmissionId } });
  await prisma.aIEvidenceAudit.create({
    data: { submissionId: numericSubmissionId, audit: auditResult },
  });

  const { generateAiTraits } = await import('./aiTraitService.js');
  const traitResult = await generateAiTraits({ submissionId: numericSubmissionId });
  if (!traitResult?.success || !Array.isArray(traitResult.traits)) {
    throw new Error(traitResult?.error || 'Failed to generate traits');
  }

  await prisma.capabilityTrait.deleteMany({ where: { submissionId: numericSubmissionId } });
  const savedTraits = [];
  for (const trait of traitResult.traits) {
    savedTraits.push(await prisma.capabilityTrait.create({
      data: {
        submissionId: numericSubmissionId,
        traitName: trait.traitName,
        confidence: trait.confidence,
        evidence: trait.evidence,
      },
    }));
  }

  const { generateCapabilityInsights } = await import('./capabilityInsightService.js');
  let insightResult = null;
  let insightError = null;
  try {
    insightResult = await generateCapabilityInsights(numericSubmissionId);
    await prisma.capabilityInsight.deleteMany({ where: { submissionId: numericSubmissionId } });
    await prisma.capabilityInsight.create({
      data: {
        submissionId: numericSubmissionId,
        strengths: insightResult.strengths,
        improvements: insightResult.improvements,
        recommendations: insightResult.recommendations,
      },
    });
  } catch (error) {
    insightError = error.message || 'Insight generation failed';
  }

  const scenario = await prisma.scenario.findUnique({ where: { id: submission.scenarioId } });
  const candidateInfo = {
    candidateCode: submission.candidate?.candidate_code || submission.attempt?.candidate?.candidate_code || 'Unknown',
    candidateName: submission.candidate?.name || submission.attempt?.candidate?.name || 'Unknown Candidate',
    candidateId: submission.candidate?.id || submission.attempt?.candidate?.id || null,
  };
  const scenarioInfo = {
    id: submission.scenarioId,
    title: scenario?.title || `Scenario ${submission.scenarioId}`,
    description: scenario?.description || null,
    category: scenario?.category || null,
  };
  const overallScore = parseFloat(((saved.understanding + saved.awareness + saved.decision + saved.actionability) / 4).toFixed(2));
  const reportPayload = {
    candidateInfo,
    scenarioInfo,
    submissionDate: submission.submittedAt,
    evaluationScores: {
      understanding: saved.understanding,
      awareness: saved.awareness,
      decision: saved.decision,
      actionability: saved.actionability,
      clarity: saved.clarity,
      overallScore,
    },
    capabilityIndices: {
      capabilityIndex: saved.capabilityIndex,
      confidenceIndex: saved.confidenceIndex,
      coverageIndex: saved.coverageIndex,
    },
    questionScores: questionScoreData.map((question) => ({
      questionId: question.questionId,
      score: question.score,
      understandingEvidence: question.understandingEvidence,
      awarenessEvidence: question.awarenessEvidence,
      decisionEvidence: question.decisionEvidence,
      actionabilityEvidence: question.actionabilityEvidence,
      clarityEvidence: question.clarityEvidence,
    })),
    aiAudit: auditResult,
    capabilityTraits: savedTraits.map((trait) => ({ traitName: trait.traitName, confidence: trait.confidence, evidence: trait.evidence })),
    strengths: insightResult?.strengths || [],
    improvements: insightResult?.improvements || [],
    recommendations: insightResult?.recommendations || [],
    generatedAt: new Date().toISOString(),
  };

  const existingReport = await prisma.evaluationReport.findFirst({
    where: { submissionId: numericSubmissionId },
    orderBy: { id: 'desc' },
  });
  const report = existingReport
    ? await prisma.evaluationReport.update({
        where: { id: existingReport.id },
        data: {
          reportData: reportPayload,
          status: 'COMPLETED',
          evaluatorComment: null,
          modifiedReport: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      })
    : await prisma.evaluationReport.create({
        data: { submissionId: numericSubmissionId, reportData: reportPayload, status: 'COMPLETED' },
      });

  if (redis) await redis.del(`report:${report.submissionId}`);

  return {
    evaluation: saved,
    report,
    traits: savedTraits.map((trait) => ({ traitName: trait.traitName, confidence: trait.confidence, evidence: trait.evidence })),
    ...(insightError ? { insightError } : { insights: insightResult }),
  };
}

module.exports = { runEvaluationPipeline };
