const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseAnswer(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    return JSON.stringify(parsed);
  } catch (e) {
    return raw;
  }
}

function normalizeSubmittedAt(raw) {
  if (!raw) return raw;
  const asDate = new Date(raw);
  if (!isNaN(asDate.getTime())) return asDate.toISOString();

  const m = String(raw).match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const hour = parseInt(m[4], 10);
    const minute = parseInt(m[5], 10);
    const second = m[6] ? parseInt(m[6], 10) : 0;
    const dt = new Date(year, month, day, hour, minute, second);
    if (!isNaN(dt.getTime())) return dt.toISOString();
  }

  return raw;
}

export async function GET(req) {
  try {
    const pathname = req.nextUrl?.pathname || new URL(req.url, 'http://localhost').pathname;
    const parts = pathname.split('/').filter(Boolean);
    const submissionId = Number(parts.at(-1));

    if (Number.isNaN(submissionId) || submissionId <= 0) {
      return Response.json({ success: false, message: 'Invalid submission ID' }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        scenarioId: true,
        submittedAt: true,
        candidate: {
          select: {
            candidate_code: true,
          },
        },
        attempt: {
          select: {
            candidate: {
              select: {
                candidate_code: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return Response.json({ success: false, message: 'Submission not found' }, { status: 404 });
    }

    const answers = await prisma.answer.findMany({
      where: { submissionId },
      orderBy: { questionId: 'asc' },
      select: {
        id: true,
        questionId: true,
        answer: true,
      },
    });

    const evaluation = await prisma.evaluation.findFirst({
      where: { responseId: submissionId },
      orderBy: { id: 'desc' },
      select: {
        understanding: true,
        awareness: true,
        decision: true,
        actionability: true,
        clarity: true,
        capabilityIndex: true,
        confidenceIndex: true,
        coverageIndex: true,
      },
    });

    const answerIds = answers.map(answer => answer.id);
    const evidenceRecords = answerIds.length > 0
      ? await prisma.evidence.findMany({
        where: {
          responseId: { in: answerIds },
        },
        orderBy: { id: 'asc' },
        select: {
          type: true,
          keyword: true,
          sentence: true,
        },
      })
      : [];

    const evidence = {
      CAUSE: [],
      DECISION: [],
      RISK: [],
      STAKEHOLDER: [],
      ACTION: [],
    };

    for (const record of evidenceRecords) {
      if (evidence[record.type]) {
        evidence[record.type].push({
          keyword: record.keyword,
          sentence: record.sentence,
        });
      }
    }

    const scenarioQuestions = await prisma.question.findMany({
      where: { scenarioId: submission.scenarioId },
      orderBy: { orderNo: 'asc' },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        orderNo: true,
      },
    });

    const questionByDbId = new Map(
      scenarioQuestions.map((question) => [Number(question.id), question])
    );

    const questions = answers
      .map((answer) => {
        const question = questionByDbId.get(Number(answer.questionId));
        const questionNumber = question?.orderNo ?? Number(answer.questionId);

        return {
          id: answer.questionId,
          questionNumber,
          question: question?.questionText || `Question ${questionNumber}`,
          answer: parseAnswer(answer.answer),
          type: question?.questionType || 'text',
        };
      })
      .sort((a, b) => Number(a.questionNumber) - Number(b.questionNumber));

    // FETCH: AI Missed Evidence from AIEvidenceAudit
    const aiAudit = await prisma.aIEvidenceAudit.findFirst({
      where: { submissionId },
      orderBy: { id: 'desc' },
      select: {
        audit: true,
      },
    });

    let aiMissedEvidence = [];
    if (aiAudit) {
      console.log('AI AUDIT RECORD FOUND');
      const missedEvidence = aiAudit.audit?.missedEvidence || [];
      aiMissedEvidence = Array.isArray(missedEvidence) ? missedEvidence : [];
      console.log('AI MISSED EVIDENCE COUNT:', aiMissedEvidence.length);
      console.log('AI MISSED EVIDENCE SENT TO DASHBOARD');
    }

    // FETCH: Capability Traits for this submission
    const capabilityTraitRecords = await prisma.capabilityTrait.findMany({
      where: { submissionId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        traitName: true,
        confidence: true,
        evidence: true,
      },
    });

    const capabilityTraits = capabilityTraitRecords.map(trait => ({
      id: trait.id,
      traitName: trait.traitName,
      confidence: trait.confidence,
      evidence: trait.evidence || []
    }));

    // FETCH: Capability Insights for this submission
    const insightRecord = await prisma.capabilityInsight.findFirst({
      where: { submissionId },
      orderBy: { id: 'desc' },
      select: {
        strengths: true,
        improvements: true,
        recommendations: true,
      },
    });

    const capabilityInsights = insightRecord ? {
      strengths: Array.isArray(insightRecord.strengths) ? insightRecord.strengths : [],
      improvements: Array.isArray(insightRecord.improvements) ? insightRecord.improvements : [],
      recommendations: Array.isArray(insightRecord.recommendations) ? insightRecord.recommendations : []
    } : {
      strengths: [],
      improvements: [],
      recommendations: []
    };

    // FETCH: Report status for this submission
    const report = await prisma.evaluationReport.findFirst({
      where: { submissionId },
      orderBy: { id: 'desc' },
      select: {
        status: true,
      },
    });

    return Response.json({
      success: true,
      submission: {
        id: submission.id,
        candidateCode: submission.candidate?.candidate_code || submission.attempt?.candidate?.candidate_code || 'Unknown',
        scenarioId: submission.scenarioId,
        scenario: `Scenario ${submission.scenarioId}`,
        date: normalizeSubmittedAt(submission.submittedAt),
        status: report?.status || 'PENDING',
        questions,
        ai: evaluation ? {
          understanding: evaluation.understanding,
          awareness: evaluation.awareness,
          decision: evaluation.decision,
          actionability: evaluation.actionability,
          clarity: evaluation.clarity,
          capabilityIndex: evaluation.capabilityIndex,
          confidenceIndex: evaluation.confidenceIndex,
          coverageIndex: evaluation.coverageIndex,
          overallScore: parseFloat(((evaluation.understanding + evaluation.awareness + evaluation.decision + evaluation.actionability) / 4).toFixed(2))
        } : null,
        evidence,
        aiMissedEvidence,
        capabilityTraits,
        capabilityInsights,
      },
    });
  } catch (error) {
    console.error('EVALUATOR SUBMISSION DETAIL ERROR:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
