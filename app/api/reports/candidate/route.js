const { PrismaClient } = require('@prisma/client');
const { parseCookies, verifyToken } = require('../../../../lib/session');

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const token = cookies['iecbp_session'];
    if (!token) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (payload.role !== 'CANDIDATE') {
      return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { userId: payload.id },
      select: { id: true },
    });
    if (!candidate) {
      return new Response(JSON.stringify({ success: false, message: 'Candidate profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const submissions = await prisma.submission.findMany({
  where: { candidateId: candidate.id },
  select: {
    id: true,
    scenarioId: true,
  },
});

    const submissionIds = submissions.map((item) => item.id);
    if (!submissionIds.length) {
      return new Response(JSON.stringify({ success: true, reports: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const reports = await prisma.evaluationReport.findMany({
      where: { submissionId: { in: submissionIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        submissionId: true,
        status: true,
        reviewedAt: true,
        evaluatorComment: true,
      },
    });

const scenarioMap = new Map(
  submissions.map((item) => [
    item.id,
    `Scenario ${item.scenarioId}`
  ])
);
    const results = reports.map((report) => ({
      submissionId: report.submissionId,
      scenario: scenarioMap.get(report.submissionId) || 'Unknown scenario',
      status: report.status,
      reviewedAt: report.reviewedAt,
      evaluatorComment: report.status === 'REJECT' ? report.evaluatorComment : null,
    }));

    return new Response(JSON.stringify({ success: true, reports: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('CANDIDATE REPORTS ERROR:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
