// app/api/submissions/route.js

const { PrismaClient } = require('@prisma/client');
const resend = require('../../../lib/resend');
const { assessmentSubmissionEmailTemplate } = require('../../../lib/emailTemplates');
const { inngest } = require('../../../lib/inngest');
const { parseCookies, verifyToken } = require('../../../lib/session');

const prisma = new PrismaClient();
const QUEUE_FAILURE_MESSAGE = 'Evaluation could not be queued.';

async function evaluationHasStarted(submissionId) {
  const answerIds = (await prisma.answer.findMany({
    where: { submissionId },
    select: { id: true },
  })).map((answer) => answer.id);

  const [evaluations, evaluationResults, scores, audits, traits, insights, legacyInsights, evidence] = await Promise.all([
    prisma.evaluation.count({ where: { responseId: submissionId } }),
    prisma.evaluationResult.count({ where: { submissionId } }),
    prisma.questionScore.count({ where: { submissionId } }),
    prisma.aIEvidenceAudit.count({ where: { submissionId } }),
    prisma.capabilityTrait.count({ where: { submissionId } }),
    prisma.capabilityInsight.count({ where: { submissionId } }),
    prisma.aIInsight.count({ where: { submissionId } }),
    answerIds.length
      ? prisma.evidence.count({ where: { responseId: { in: answerIds } } })
      : Promise.resolve(0),
  ]);

  return evaluations > 0 || evaluationResults > 0 || scores > 0 || audits > 0 ||
    traits > 0 || insights > 0 || legacyInsights > 0 || evidence > 0;
}

async function sendEvaluationEvent(submission, reportId, recovered) {
  try {
    await inngest.send({
      name: 'evaluation/submitted',
      id: `evaluation-submission-${submission.id}`,
      data: {
        submissionId: submission.id,
        scenarioId: submission.scenarioId,
        attemptId: submission.attemptId,
      },
    });
    return Response.json({
      success: true,
      submissionId: submission.id,
      evaluationStatus: 'PROCESSING',
      ...(recovered ? { recovered: true } : {}),
    });
  } catch {
    console.error('EVALUATION EVENT COULD NOT BE QUEUED');
    await prisma.evaluationReport.updateMany({
      where: { id: reportId, status: 'PROCESSING' },
      data: {
        status: 'FAILED',
        reportData: { error: QUEUE_FAILURE_MESSAGE },
      },
    });
    return Response.json({
      success: false,
      submissionSaved: true,
      submissionId: submission.id,
      message: 'Your submission is saved, but evaluation could not be queued. Please retry later.',
    }, { status: 503 });
  }
}

export async function POST(req) {
  try {
    const token = parseCookies(req.headers.get('cookie')).iecbp_session;
    if (!token) {
      return Response.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    let session;
    try {
      session = verifyToken(token);
    } catch {
      return Response.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    if (session.role !== 'CANDIDATE' || !Number.isInteger(Number(session.id)) || Number(session.id) <= 0) {
      return Response.json({ success: false, message: 'Not authorized to submit this assessment' }, { status: 403 });
    }

    const body = await req.json();
    const {
      scenarioId,
      answers,
      attemptId
    } = body;

    const normalizedAttemptId = Number(attemptId);
    const normalizedScenarioId = Number(scenarioId);
    const hasAnswers = answers && typeof answers === 'object' && !Array.isArray(answers);

    if (!Number.isInteger(normalizedAttemptId) || normalizedAttemptId <= 0) {
      return Response.json({
        success: false,
        message: 'Attempt ID is required and must be a positive integer',
      }, {
        status: 400,
      });
    }

    if (!Number.isInteger(normalizedScenarioId) || normalizedScenarioId <= 0) {
      return Response.json({
        success: false,
        message: 'Scenario ID is required and must be a positive integer',
      }, {
        status: 400,
      });
    }

    if (!hasAnswers || Object.keys(answers).length === 0) {
      return Response.json({
        success: false,
        message: 'Answers are required for submission',
      }, {
        status: 400,
      });
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        id: normalizedAttemptId,
      },
    });

    if (!attempt) {
      return Response.json({
        success: false,
        message: 'Exam attempt not found',
      }, {
        status: 404,
      });
    }

    if (Number(attempt.userId) !== Number(session.id)) {
      return Response.json({ success: false, message: 'Not authorized to submit this assessment' }, { status: 403 });
    }

    const formattedAnswers = Object.entries(answers).map(
      ([questionId, answer]) => ({
        questionId: Number(questionId),
        answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
      })
    );

    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${normalizedAttemptId}::int4, ${normalizedScenarioId}::int4)::text`;

      const existingSubmission = await transaction.submission.findFirst({
        where: { attemptId: normalizedAttemptId, scenarioId: normalizedScenarioId },
      });
      if (existingSubmission) {
        return { submission: existingSubmission, report: null, created: false };
      }

      const submission = await transaction.submission.create({
        data: {
          scenarioId: normalizedScenarioId,
          attemptId: normalizedAttemptId,
          candidateId: attempt.candidateId ? Number(attempt.candidateId) : null,
          submittedAt: new Date().toISOString(),
        },
      });

      await transaction.answer.createMany({
        data: formattedAnswers.map((answer) => ({ ...answer, submissionId: submission.id })),
      });

      const durationMinutes = Math.max(
        1,
        Math.round((Date.now() - new Date(attempt.start_time).getTime()) / 60000)
      );
      await transaction.examAttempt.update({
        where: { id: normalizedAttemptId },
        data: {
          status: 'submitted',
          submit_time: new Date(),
          duration_minutes: durationMinutes,
        },
      });

      const report = await transaction.evaluationReport.create({
        data: {
          submissionId: submission.id,
          reportData: {},
          status: 'PROCESSING',
        },
      });

      return { submission, report, created: true };
    });

    console.log("ANSWERS STORED");

    if (!result.created) {
      const existingReport = await prisma.evaluationReport.findFirst({
        where: { submissionId: result.submission.id },
        orderBy: { id: 'desc' },
      });

      if (existingReport?.status === 'FAILED' && existingReport.reportData?.error === QUEUE_FAILURE_MESSAGE) {
        if (await evaluationHasStarted(result.submission.id)) {
          return Response.json({
            success: false,
            duplicatePrevented: true,
            submissionId: result.submission.id,
            message: 'Evaluation has already started; this submission will not be queued again.',
          }, { status: 409 });
        }

        const claim = await prisma.evaluationReport.updateMany({
          where: {
            id: existingReport.id,
            status: 'FAILED',
            reportData: { equals: { error: QUEUE_FAILURE_MESSAGE } },
          },
          data: { status: 'PROCESSING', reportData: {} },
        });

        if (claim.count === 1) {
          return sendEvaluationEvent(result.submission, existingReport.id, true);
        }
      }

      return Response.json({
        success: true,
        duplicatePrevented: true,
        submissionId: result.submission.id,
        evaluationStatus: existingReport?.status || 'UNKNOWN',
      });
    }

    // ─────────────────────────────────────
    // STEP 3.5 — Send confirmation email and notification
    // ─────────────────────────────────────

    try {
      if (attempt.userId) {
        const user = await prisma.user.findUnique({
          where: { id: attempt.userId },
          include: { candidate: true },
        });

        if (user && user.candidate) {
          const submittedDt = new Date(submission.submittedAt);
          const submissionDate = submittedDt.toLocaleDateString('en-IN');
          const submissionTime = submittedDt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          const emailHtml = assessmentSubmissionEmailTemplate(
            user.name || 'Candidate',
            user.candidate.candidate_code,
            submissionDate,
            submissionTime
          );

          await resend.emails.send({
            from: 'IECBP <onboarding@resend.dev>',
            to: user.email,
            subject: 'Assessment Submission Confirmation – IECBP',
            html: emailHtml,
          });

          await prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Assessment Submitted Successfully',
              message: 'Your assessment has been submitted successfully. Your responses are now under evaluation. Results will be available within 48 hours.',
              isRead: false,
            },
          });

          console.log("CONFIRMATION EMAIL AND NOTIFICATION SENT");
        }
      }
    } catch (emailError) {
      console.error("ERROR SENDING CONFIRMATION EMAIL:", emailError);
    }

    console.log("EXAM ATTEMPT UPDATED");
    return sendEvaluationEvent(result.submission, result.report.id, false);

  } catch (error) {

    console.error("SUBMISSION ERROR:", error?.message || 'Unknown error');

    return Response.json(
      {
        success: false,
        message: 'Failed to save submission',
      },
      {
        status: 500,
      }
    );
  }
}