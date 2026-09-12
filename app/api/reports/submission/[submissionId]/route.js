import { PrismaClient } from '@prisma/client';
import { getOrSetCache } from '../../../../../lib/cache';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const pathname = req.nextUrl?.pathname || new URL(req.url, 'http://localhost').pathname;
    const parts = pathname.split('/').filter(Boolean);
    const submissionId = Number(parts.at(-1));

    if (Number.isNaN(submissionId) || submissionId <= 0) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid submission ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const report = await getOrSetCache(`report:${submissionId}`, async () => {
      const latestReport = await prisma.evaluationReport.findFirst({
        where: { submissionId },
        orderBy: { id: 'desc' },
        select: {
          id: true,
          submissionId: true,
          reportData: true,
          status: true,
          evaluatorComment: true,
          modifiedReport: true,
          reviewedBy: true,
          reviewedAt: true,
          createdAt: true,
        },
      });

      if (!latestReport || latestReport.reportData === null || latestReport.reportData === undefined) {
        return null;
      }

      return latestReport;
    }, 60 * 60 * 4);

    if (!report) {
      const pendingReport = await prisma.evaluationReport.findFirst({
        where: { submissionId },
        orderBy: { id: 'desc' },
        select: {
          id: true,
          submissionId: true,
          reportData: true,
          status: true,
          evaluatorComment: true,
          modifiedReport: true,
          reviewedBy: true,
          reviewedAt: true,
          createdAt: true,
        },
      });

      if (pendingReport) {
        return new Response(JSON.stringify({ success: true, report: pendingReport }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: false, message: 'Report not found', report: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, report }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('REPORT FETCH ERROR:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
