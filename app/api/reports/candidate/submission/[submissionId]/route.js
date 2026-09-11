const { PrismaClient } = require('@prisma/client');
const { parseCookies, verifyToken } = require('../../../../../../lib/session');

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

    const pathname = req.nextUrl?.pathname || new URL(req.url).pathname;
    const parts = pathname.split('/').filter(Boolean);
    const submissionId = Number(parts.at(-1));

    if (Number.isNaN(submissionId) || submissionId <= 0) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid submission ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { userId: payload.id },
      select: { id: true },
    });
    if (!candidate) {
      return new Response(JSON.stringify({ success: false, message: 'Candidate profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, candidateId: candidate.id },
      select: {
        id: true,
        scenarioId: true,
      },
    });

    if (!submission) {
      return new Response(JSON.stringify({ success: false, message: 'Submission not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const report = await prisma.evaluationReport.findFirst({
      where: { submissionId },
      orderBy: { id: 'desc' },
      select: {
        submissionId: true,
        status: true,
        reviewedAt: true,
        evaluatorComment: true,
        reportData: true,
        modifiedReport: true,
      },
    });

    if (!report) {
      return new Response(JSON.stringify({ success: false, message: 'Report not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const response = {
      submissionId: report.submissionId,
scenario: `Scenario ${submission.scenarioId}`,
      status: report.status,
      reviewedAt: report.reviewedAt,
      evaluatorComment: report.evaluatorComment,
      reportData: report.reportData,
      modifiedReport: report.modifiedReport,
    };

    return new Response(JSON.stringify({ success: true, report: response }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('CANDIDATE REPORT DETAIL ERROR:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
