const { inngest } = require('../../lib/inngest');
const { PrismaClient } = require('@prisma/client');
const { redis } = require('../../lib/redis');
const { runEvaluationPipeline } = require('../services/evaluationPipelineService');

const prisma = new PrismaClient();

const evaluateSubmissionFunction = inngest.createFunction(
  {
    id: 'evaluate-submission',
    triggers: { event: 'evaluation/submitted' },
    concurrency: { limit: 1, key: 'event.data.submissionId' },
    retries: 3,
    onFailure: async ({ event, error }) => {
      const submissionId = Number(event?.data?.submissionId);
      if (!Number.isInteger(submissionId) || submissionId <= 0) return;

      const report = await prisma.evaluationReport.findFirst({
        where: { submissionId },
        orderBy: { id: 'desc' },
      });

      if (report && ['PROCESSING', 'FAILED'].includes(report.status)) {
        await prisma.evaluationReport.update({
          where: { id: report.id },
          data: {
            status: 'FAILED',
            reportData: {
              error: 'Evaluation failed. Please contact an administrator.',
            },
          },
        });
      }

      if (redis) await redis.del(`report:${submissionId}`);

      console.error('BACKGROUND EVALUATION FAILED', {
        submissionId,
        message: error?.message || 'Unknown evaluation error',
      });
    },
  },
  async ({ event, step }) => {
    const { submissionId, scenarioId, attemptId } = event.data;

    const currentReport = await step.run('check-evaluation-status', async () => {
      return prisma.evaluationReport.findFirst({
        where: { submissionId: Number(submissionId) },
        orderBy: { id: 'desc' },
        select: { status: true },
      });
    });

    if (currentReport && currentReport.status !== 'PROCESSING') {
      return { skipped: true, status: currentReport.status };
    }

    return step.run('run-evaluation-pipeline', () => runEvaluationPipeline({
      submissionId,
      scenarioId,
      attemptId,
    }));
  }
);

module.exports = { evaluateSubmissionFunction };
