const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const scenarioNames = {
  1: 'Scenario 1',
  2: 'Scenario 2',
  3: 'Scenario 3',
  4: 'Scenario 4',
  5: 'Scenario 5',
  6: 'Scenario 6',
};

export async function GET() {
  try {
    const submissions = await prisma.submission.findMany({
      orderBy: {
        submittedAt: 'desc',
      },
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

    const submissionIds = submissions.map(submission => submission.id);
    const evaluations = await prisma.evaluation.findMany({
      where: {
        responseId: { in: submissionIds },
      },
      select: {
        responseId: true,
        capabilityIndex: true,
        confidenceIndex: true,
        coverageIndex: true,
      },
    });
    const evaluationBySubmission = new Map(
      evaluations.map(evaluation => [evaluation.responseId, evaluation])
    );

    const reports = await prisma.evaluationReport.findMany({
      where: {
        submissionId: { in: submissionIds },
      },
      select: {
        submissionId: true,
        status: true,
      },
    });

    function normalizeSubmittedAt(raw) {
      if (!raw) return raw;
      const asDate = new Date(raw);
      if (!isNaN(asDate.getTime())) return asDate.toISOString();

      // Try parsing common en-IN locale format: "DD/MM/YYYY, HH:MM:SS"
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

    const reportBySubmission = new Map(
      reports.map(report => [report.submissionId, report])
    );
    const payload = submissions.map(submission => {
      const evaluation = evaluationBySubmission.get(submission.id);
            const report = reportBySubmission.get(submission.id);

      return {
        id: submission.id,
        candidateCode: submission.candidate?.candidate_code || submission.attempt?.candidate?.candidate_code || 'Unknown',
        scenario: scenarioNames[submission.scenarioId] || `Scenario ${submission.scenarioId}`,
        date: normalizeSubmittedAt(submission.submittedAt),
        status: report?.status || 'PENDING',
        capabilityIndex: evaluation?.capabilityIndex ?? null,
        confidenceIndex: evaluation?.confidenceIndex ?? null,
        coverageIndex: evaluation?.coverageIndex ?? null,
      };
    });

    return Response.json({ success: true, submissions: payload });
  } catch (error) {
    console.error('EVALUATOR SUBMISSIONS ERROR:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
