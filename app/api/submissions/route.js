// app/api/submissions/route.js

const { PrismaClient } = require('@prisma/client');
const resend = require('../../../lib/resend');
const { assessmentSubmissionEmailTemplate } = require('../../../lib/emailTemplates');
const { inngest } = require('../../../lib/inngest');

const prisma = new PrismaClient();

console.log("SUBMISSION API HIT");
export async function POST(req) {

  try {

    const body = await req.json();

    console.log("SUBMISSION BODY:", body);

    const {
      scenarioId,
      answers,
      attemptId
    } = body;

    const normalizedAttemptId = Number(attemptId);
    const normalizedScenarioId = Number(scenarioId);
    const hasAnswers = answers && typeof answers === 'object' && !Array.isArray(answers);

    console.log("VALIDATION CHECKPOINT:", {
      attemptId,
      normalizedAttemptId,
      attemptIdType: typeof attemptId,
      scenarioId,
      normalizedScenarioId,
      scenarioIdType: typeof scenarioId,
      answersType: Array.isArray(answers) ? 'array' : typeof answers,
      answersCount: hasAnswers ? Object.keys(answers).length : 0
    });

    if (!Number.isInteger(normalizedAttemptId) || normalizedAttemptId <= 0) {
      console.error("SUBMISSION ERROR: invalid or missing attemptId", { attemptId });
      return Response.json({
        success: false,
        message: 'Attempt ID is required and must be a positive integer',
        attemptId
      }, {
        status: 400,
      });
    }

    if (!Number.isInteger(normalizedScenarioId) || normalizedScenarioId <= 0) {
      console.error("SUBMISSION ERROR: invalid or missing scenarioId", { scenarioId });
      return Response.json({
        success: false,
        message: 'Scenario ID is required and must be a positive integer',
        scenarioId
      }, {
        status: 400,
      });
    }

    if (!hasAnswers || Object.keys(answers).length === 0) {
      console.error("SUBMISSION ERROR: missing answers", { answers });
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

    const existingSubmission = await prisma.submission.findFirst({
      where: {
        attemptId: Number(attemptId),
        scenarioId,
      },
    });

    if (existingSubmission) {
      return Response.json({
        success: true,
        duplicatePrevented: true,
        submissionId: existingSubmission.id,
      });
    }

    const candidateId = attempt.candidateId ? Number(attempt.candidateId) : null;

    const submission = await prisma.submission.create({
      data: {
        scenarioId,
        attemptId: Number(attemptId),
        candidateId,
        submittedAt: new Date().toISOString(),
      },
    });

    // ─────────────────────────────────────
    // STEP 2 — Format answers
    // ─────────────────────────────────────

    const formattedAnswers = Object.entries(answers).map(
      ([questionId, answer]) => ({

        submissionId: submission.id,

        questionId: Number(questionId),

        answer:
          typeof answer === 'string'
            ? answer
            : JSON.stringify(answer),
      })
    );

    // ─────────────────────────────────────
    // STEP 3 — Store answers
    // ─────────────────────────────────────

    await prisma.answer.createMany({
      data: formattedAnswers,
    });

    console.log("ANSWERS STORED");

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

    // ─────────────────────────────────────
    // UPDATE EXAM ATTEMPT
    // ─────────────────────────────────────

    if (attemptId !== undefined && attemptId !== null) {

      const attempt =
        await prisma.examAttempt.findUnique({
          where: {
            id: Number(attemptId),
          },
        });

      if (attempt) {

        const startTime =
          new Date(attempt.start_time);

        const endTime =
          new Date();

        const duration_minutes =
          Math.max(
            1,
            Math.round(
              (endTime - startTime) / 60000
            )
          );

        await prisma.examAttempt.update({
          where: {
            id: Number(attemptId),
          },

          data: {
            status: 'submitted',

            submit_time: new Date(),

            duration_minutes: Number(duration_minutes),
          },
        });

        console.log("EXAM ATTEMPT UPDATED");
      }
    }

    const existingReport = await prisma.evaluationReport.findFirst({
      where: { submissionId: submission.id },
      orderBy: { id: 'desc' },
    });

    if (existingReport) {
      await prisma.evaluationReport.update({
        where: { id: existingReport.id },
        data: {
          status: 'PROCESSING',
          reportData: {},
          evaluatorComment: null,
          modifiedReport: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
    } else {
      await prisma.evaluationReport.create({
        data: {
          submissionId: submission.id,
          reportData: {},
          status: 'PROCESSING',
        },
      });
    }

    try {
      await inngest.send({
        name: 'evaluation/submitted',
        data: {
          submissionId: submission.id,
          scenarioId: Number(scenarioId),
          attemptId: Number(attemptId),
        },
      });
    } catch (eventError) {
      const report = await prisma.evaluationReport.findFirst({
        where: { submissionId: submission.id },
        orderBy: { id: 'desc' },
      });
      if (report) {
        await prisma.evaluationReport.update({
          where: { id: report.id },
          data: {
            status: 'FAILED',
            reportData: { error: 'Evaluation could not be queued.' },
          },
        });
      }
      throw eventError;
    }

    return Response.json({
      success: true,
      submissionId: submission.id,
      evaluationStatus: 'PROCESSING',
    });

  } catch (error) {

    console.error(
      "SUBMISSION ERROR:",
      error
    );

    return Response.json(
      {
        success: false,

        message:
          'Failed to save submission',
      },
      {
        status: 500,
      }
    );
  }
}