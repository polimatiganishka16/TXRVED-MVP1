const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const questionBanks = {
  1: require('../../../../../data/scenario1Questions').scenario1Questions,
  2: require('../../../../../data/scenario2Questions').scenario2Questions,
  3: require('../../../../../data/scenario3Questions').scenario3Questions,
  4: require('../../../../../data/scenario4Questions').scenario4Questions,
  5: require('../../../../../data/scenario5Questions').scenario5Questions,
  6: require('../../../../../data/scenario6Questions').scenario6Questions,
};

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
      include: {
        candidate: true,
        attempt: {
          include: {
            candidate: true,
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
    });

    const evaluation = await prisma.evaluation.findFirst({
      where: { responseId: submissionId },
      orderBy: { id: 'desc' },
    });

    const answerIds = answers.map(answer => answer.id);
    const evidenceRecords = answerIds.length > 0
      ? await prisma.evidence.findMany({
        where: {
          responseId: { in: answerIds },
        },
        orderBy: { id: 'asc' },
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

    const questionBank = questionBanks[submission.scenarioId] || [];
    const questions = answers.map(answer => {
      const bankQuestion = questionBank.find(q => Number(q.id) === Number(answer.questionId));
      return {
        id: answer.questionId,
        question: bankQuestion?.question || `Question ${answer.questionId}`,
        answer: parseAnswer(answer.answer),
        type: bankQuestion?.type || 'text',
      };
    });

    // FETCH: AI Missed Evidence from AIEvidenceAudit
    const aiAudit = await prisma.aIEvidenceAudit.findFirst({
      where: { submissionId },
      orderBy: { id: 'desc' }
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
      orderBy: { id: 'asc' }
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
      orderBy: { id: 'desc' }
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
      orderBy: { id: 'desc' }
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
