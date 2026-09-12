const { PrismaClient } = require('@prisma/client');
const { redis } = require('../../../../lib/redis');

const prisma = new PrismaClient();

const {
  evaluateSubmission
} = require('../../../../evaluation/evaluationEngine');

export async function POST(req) {

  try {

    const body = await req.json();

    const { submissionId, scenarioId } = body;

    // STEP 1 — fetch submission and answers from DB
    const submission = await prisma.submission.findUnique({
      where: { id: Number(submissionId) },
      include: {
        candidate: true,
        attempt: {
          include: {
            candidate: true,
          }
        }
      }
    });

    const dbAnswers = await prisma.answer.findMany({
      where: {
        submissionId
      }
    });

    const attemptId = submission?.attemptId ?? null;

    const scenarioQuestions = await prisma.question.findMany({
      where: { scenarioId: Number(submission?.scenarioId ?? scenarioId) },
      select: {
        id: true,
        orderNo: true,
        questionText: true,
        questionType: true,
      },
      orderBy: { orderNo: 'asc' },
    });

    const questionIdToOrderNo = new Map(
      scenarioQuestions.map((question) => [Number(question.id), Number(question.orderNo)])
    );
    const orderNoToQuestionId = new Map(
      scenarioQuestions.map((question) => [Number(question.orderNo), Number(question.id)])
    );

    console.log("DB ANSWERS:", dbAnswers);

    const { extractEvidence } = await import('../../../services/evidenceService.js');
    const evidenceSummary = await extractEvidence(submissionId);
    console.log("EVIDENCE SUMMARY:", evidenceSummary);

    const evidenceRecords = await prisma.evidence.findMany({
      where: {
        responseId: { in: dbAnswers.map((a) => a.id) }
      }
    });

    const evidenceByQuestionId = new Map();
    for (const answer of dbAnswers) {
      evidenceByQuestionId.set(answer.questionId, []);
    }
    for (const record of evidenceRecords) {
      const answer = dbAnswers.find((a) => a.id === record.responseId);
      if (!answer) continue;
      const items = evidenceByQuestionId.get(answer.questionId) || [];
      const duplicate = items.some((item) => item.type === record.type && item.keyword === record.keyword && item.sentence === record.sentence);
      if (!duplicate) {
        items.push({ type: record.type, keyword: record.keyword, sentence: record.sentence });
      }
      evidenceByQuestionId.set(answer.questionId, items);
    }

    const { generateSignals } = await import('../../../services/signalService.js');
    const signals = await generateSignals(submissionId);
    console.log("SIGNALS:", signals);

    const { calculateScores } = await import('../../../services/scoringService.js');
    const scores = calculateScores({
      understanding: signals.understanding,
      awareness: signals.awareness,
      decision: signals.decision,
      actionability: signals.actionability,
      clarity: signals.clarity,
      evidenceCounts: evidenceSummary
    });

    console.log("EVIDENCE COUNTS:", evidenceSummary);
    console.log("FINAL INDICES:", scores);

    // STEP 2 — format answers for engine using scenario-local orderNo while preserving DB question IDs
    const formattedAnswers = dbAnswers.map((a) => {
      const dbQuestionId = Number(a.questionId);
      const questionOrderNo = questionIdToOrderNo.get(dbQuestionId) ?? Number(String(a.questionId).replace(/^q/i, ''));

      return {
        questionId: `q${questionOrderNo}`,
        answer: a.answer,
      };
    });
    console.log("FORMATTED:", formattedAnswers);

    // STEP 3 — run evaluation engine
    const result = await evaluateSubmission(
      scenarioId,
      formattedAnswers
    );

    console.log("EVALUATION RESULT:", result);

    // STEP 4 — clear any existing evaluation row for this submission to avoid duplicates
    await prisma.evaluation.deleteMany({
      where: { responseId: Number(submissionId) }
    });

    const saved =
      await prisma.evaluation.create({
        data: {
          responseId: Number(submissionId),
          understanding: signals.understanding,
          clarity: signals.clarity,
          awareness: signals.awareness,
          decision: signals.decision,
          actionability: signals.actionability,
          capabilityIndex: scores.capabilityIndex,
          confidenceIndex: scores.confidenceIndex,
          coverageIndex: scores.coverageIndex
        }
      });

    const questionScoreData = result.evaluatedQuestions.map((question) => {
      const questionOrderNo = Number(String(question.questionId).replace(/^q/i, ''));
      const dbQuestionId = orderNoToQuestionId.get(questionOrderNo) ?? questionOrderNo;
      const questionEvidence = evidenceByQuestionId.get(dbQuestionId) || evidenceByQuestionId.get(questionOrderNo) || [];
      const answerText = typeof question.rawAnswer === 'string'
        ? question.rawAnswer
        : JSON.stringify(question.rawAnswer);
      const clarityEvidence = [{
        wordCount: answerText.trim().split(/\s+/).filter(Boolean).length,
        excerpt: answerText.slice(0, 120)
      }];

      return {
        submissionId: Number(submissionId),
        attemptId,
        questionId: dbQuestionId,
        score: question.score,
        understandingEvidence: questionEvidence.filter((item) => item.type === 'CAUSE' || item.type === 'STAKEHOLDER'),
        awarenessEvidence: questionEvidence.filter((item) => item.type === 'RISK' || item.type === 'STAKEHOLDER'),
        decisionEvidence: questionEvidence.filter((item) => item.type === 'DECISION'),
        actionabilityEvidence: questionEvidence.filter((item) => item.type === 'ACTION'),
        clarityEvidence,
      };
    });

    await prisma.questionScore.deleteMany({
      where: { submissionId: Number(submissionId) }
    });

    await prisma.questionScore.createMany({
      data: questionScoreData
    });

    console.log("QUESTION SCORES SAVED:", questionScoreData.length);

    // STEP 5 — AI Evidence Audit
    console.log("AI AUDIT STARTED");

    const { auditEvidenceGaps } = await import('../../../services/aiEvidenceAuditService.js');
    const auditResult = await auditEvidenceGaps(Number(submissionId));
    console.log("AI AUDIT RESULT:", auditResult);

    const auditSaved = await prisma.aIEvidenceAudit.create({
      data: {
        submissionId: Number(submissionId),
        audit: auditResult
      }
    });

    console.log("AI AUDIT SAVED");
    console.log("AI AUDIT COMPLETED");

    console.log("EVALUATION SAVED:", saved);

    // ---- AI Orchestration: Traits -> Insights ----
    // Inserted here so evaluation and AI audit are persisted before running AI pipeline
    let savedTraits = [];
    let insightResult = null;
    let insightError = null;

    try {
      console.log("AI TRAITS STARTED");
      const { generateAiTraits } = await import('../../../services/aiTraitService.js');

      const traitResult = await generateAiTraits({ submissionId: Number(submissionId) });

      if (!traitResult || !traitResult.success || !Array.isArray(traitResult.traits)) {
        return Response.json({ success: false, stage: "traits", error: traitResult && traitResult.error ? traitResult.error : "Failed to generate traits" }, { status: 500 });
      }

      // Delete any existing CapabilityTrait rows for this submission
      await prisma.capabilityTrait.deleteMany({ where: { submissionId: Number(submissionId) } });

      // Save validated traits
      for (const trait of traitResult.traits) {
        const created = await prisma.capabilityTrait.create({
          data: {
            submissionId: Number(submissionId),
            traitName: trait.traitName,
            confidence: trait.confidence,
            evidence: trait.evidence,
          }
        });
        savedTraits.push(created);
      }

      console.log("AI TRAITS SAVED");

    } catch (error) {
      console.error("AI TRAITS FAILED", { message: error.message });
      return Response.json({ success: false, stage: "traits", error: error.message }, { status: 500 });
    }

    try {
      console.log("CAPABILITY INSIGHT STARTED");
      const { generateCapabilityInsights } = await import('../../../services/capabilityInsightService.js');

      insightResult = await generateCapabilityInsights(Number(submissionId));

      const createdInsight = await prisma.capabilityInsight.create({
        data: {
          submissionId: Number(submissionId),
          strengths: insightResult.strengths,
          improvements: insightResult.improvements,
          recommendations: insightResult.recommendations,
        }
      });

      console.log("CAPABILITY INSIGHT SAVED");
    } catch (error) {
      insightError = error.message || "Insight generation failed";
      console.error("CAPABILITY INSIGHT FAILED", { message: insightError });
      // Do not rollback saved traits; continue to return success with insightError
    }

    console.log("AI PIPELINE COMPLETED");

    const scenario = await prisma.scenario.findUnique({
      where: { id: submission.scenarioId }
    });

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
      capabilityTraits: savedTraits.map(trait => ({
        traitName: trait.traitName,
        confidence: trait.confidence,
        evidence: trait.evidence,
      })),
      strengths: insightResult?.strengths || [],
      improvements: insightResult?.improvements || [],
      recommendations: insightResult?.recommendations || [],
      generatedAt: new Date().toISOString(),
    };

    const existingReport = await prisma.evaluationReport.findFirst({
      where: { submissionId: Number(submissionId) },
      orderBy: { id: 'desc' }
    });

    const report = existingReport
      ? await prisma.evaluationReport.update({
        where: { id: existingReport.id },
        data: {
          reportData: reportPayload,
          status: 'PENDING',
          evaluatorComment: null,
          modifiedReport: null,
          reviewedBy: null,
          reviewedAt: null,
        }
      })
      : await prisma.evaluationReport.create({
        data: {
          submissionId: Number(submissionId),
          reportData: reportPayload,
          status: 'PENDING',
        }
      });

    console.log("EVALUATION REPORT SAVED", report.id);

    if (redis) {
      await redis.del(`report:${report.submissionId}`);
    }

    // Final success response including evaluation, traits, insights, and report
    const responseBody = {
      success: true,
      evaluation: saved,
      report,
      traits: savedTraits.map(t => ({ traitName: t.traitName, confidence: t.confidence, evidence: t.evidence })),
    };

    if (insightError) {
      responseBody.insightError = insightError;
    } else if (insightResult) {
      responseBody.insights = insightResult;
    }

    return Response.json(responseBody, { status: 200 });

  } catch (error) {

    console.log("EVALUATION ERROR:", error);

    return Response.json({
      success: false,
      error: error.message
    });
  }
}