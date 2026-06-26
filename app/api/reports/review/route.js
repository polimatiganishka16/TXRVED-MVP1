const { parseCookies, verifyToken } = require('../../../../lib/session');
const { PrismaClient } = require('@prisma/client');
const resend = require('../../../../lib/resend');

const prisma = new PrismaClient();

async function sendReportEmailToCandidate(report, status) {
  const submissionId = Number(report?.submissionId);
  if (!submissionId) {
    throw new Error('Submission ID is missing');
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      candidate: {
        include: {
          user: true,
        },
      },
    },
  });

  const scenario = await prisma.scenario.findUnique({
    where: { id: submission?.scenarioId },
  });

  const candidateName = submission?.candidate?.name || submission?.candidate?.user?.name || 'there';
  const candidateEmail = submission?.candidate?.user?.email;
  const scenarioName = scenario?.title || 'IECBP Engineering Capability Evaluation';

  if (!candidateEmail) {
    throw new Error('Candidate email is missing');
  }

  // Email content varies by status
  const emailConfigs = {
    APPROVE: {
      subject: 'IECBP Evaluation Report Available',
      heading: 'IECBP Evaluation Report Available',
      intro: 'We are pleased to inform you that your submission for the IECBP Engineering Capability Evaluation has been successfully reviewed by the evaluation panel.',
      context: 'Your evaluation report has now been published and is available for viewing within the IECBP Evaluation System.',
      evaluationStatus: 'Approved',
      reportStatus: 'Available',
      reportIncludes: [
        'Capability Assessment Results',
        'Engineering Capability Traits',
        'AI-Assisted Evaluation Insights',
        'Performance Feedback &amp; Recommendations',
      ],
      callToAction: 'Please log in to the system to review your complete evaluation report.',
    },
    REJECT: {
      subject: 'IECBP Evaluation Report Available',
      heading: 'IECBP Evaluation Report Available',
      intro: 'Your submission for the IECBP Engineering Capability Evaluation has been reviewed by the evaluation panel.',
      context: 'The evaluation report is now available in the IECBP Evaluation System.',
      evaluationStatus: 'Rejected',
      reportStatus: 'Available',
      reportIncludes: [
        'Capability Assessment Results',
        'AI Capability Traits',
        'Improvement Areas',
        'Recommendations',
        'Evaluator Remarks',
      ],
      callToAction: 'Please log in to the system to review the complete evaluation report and the evaluator\'s feedback.',
    },
    MODIFY: {
      subject: 'IECBP Evaluation Report Updated',
      heading: 'IECBP Evaluation Report Updated',
      intro: 'Your evaluation report has been reviewed and updated by the evaluation panel.',
      context: 'The updated evaluation report is now available in the IECBP Evaluation System.',
      evaluationStatus: 'Modified',
      reportStatus: 'Updated',
      reportIncludes: [
        'Updated Capability Assessment Results',
        'Updated AI Capability Traits',
        'Updated Strengths',
        'Updated Improvement Areas',
        'Updated Recommendations',
      ],
      callToAction: 'Please log in to the system to review your updated evaluation report.',
    },
  };

  const config = emailConfigs[status] || emailConfigs.APPROVE;

  const reportIncludesHtml = config.reportIncludes.map(item => `<li>${item}</li>`).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="color: #1d4ed8;">${config.heading}</h2>
      <p>Dear ${candidateName},</p>
      <p>${config.intro}</p>
      <p>${config.context}</p>
      <p><strong>Assessment Details:</strong></p>
      <ul>
        <li><strong>Scenario:</strong> ${scenarioName}</li>
        <li><strong>Submission ID:</strong> ${submissionId}</li>
        <li><strong>Evaluation Status:</strong> ${config.evaluationStatus}</li>
        <li><strong>Report Status:</strong> ${config.reportStatus}</li>
      </ul>
      <p>The report includes:</p>
      <ul>
        ${reportIncludesHtml}
      </ul>
      <p>${config.callToAction}</p>
      <p>Thank you for participating in the IECBP Evaluation Process.</p>
      <p>Best Regards,<br/>IECBP Evaluation System<br/>Engineering Capability Assessment Platform</p>
    </div>
  `;

  await resend.emails.send({
    from: 'IECBP <onboarding@resend.dev>',
    to: candidateEmail,
    subject: config.subject,
    html,
  });

  return { sent: true, candidateEmail, candidateName, scenarioName, submissionId, status };
}

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const token = cookies['iecbp_session'];
    let reviewerId = null;

    if (!token) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (!payload || payload.role !== 'EVALUATOR') {
      return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    reviewerId = payload.id;

    const body = await request.json();
    const { reportId, action, evaluatorComment, modifiedReport } = body;

    if (!reportId || !action) {
      return new Response(JSON.stringify({ success: false, message: 'Missing reportId or action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const normalized = String(action).toUpperCase();
    const validActions = ['APPROVE', 'MODIFY', 'REJECT'];
    if (!validActions.includes(normalized)) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const report = await prisma.evaluationReport.findUnique({ where: { id: Number(reportId) } });
    if (!report) {
      return new Response(JSON.stringify({ success: false, message: 'Report not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const now = new Date();
    let updateData = {
      status: normalized,
      reviewedAt: now,
      reviewedBy: reviewerId,
    };

    if (normalized === 'APPROVE') {
      updateData.evaluatorComment = evaluatorComment ?? report.evaluatorComment;
    }

    if (normalized === 'MODIFY') {
      updateData.modifiedReport = typeof modifiedReport === 'object' && modifiedReport !== null
        ? modifiedReport
        : report.reportData;
      updateData.evaluatorComment = evaluatorComment ?? report.evaluatorComment;
    }

    if (normalized === 'REJECT') {
      if (!evaluatorComment || evaluatorComment.trim().length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Rejection reason is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      
      // Generate rejection-specific insights
      try {
        console.log('GENERATING REJECTED REPORT INSIGHTS FOR SUBMISSION:', report.submissionId);
        const { generateRejectedReportInsights } = await import('../../../services/rejectedReportService.js');
        const rejectedInsights = await generateRejectedReportInsights(Number(report.submissionId));
        
        updateData.evaluatorComment = evaluatorComment;
        updateData.reportData = {
          ...report.reportData,
          capabilityTraits: report.reportData.capabilityTraits || [],
          strengths: rejectedInsights.strengths,
          improvements: rejectedInsights.improvements,
          recommendations: rejectedInsights.recommendations,
        };
        
        console.log('REJECTED REPORT INSIGHTS APPLIED:', {
          submissionId: report.submissionId,
          capabilityTraits: (report.reportData.capabilityTraits || []).length,
          strengths: rejectedInsights.strengths.length,
          improvements: rejectedInsights.improvements.length,
          recommendations: rejectedInsights.recommendations.length,
        });
      } catch (insightError) {
        console.error('FAILED TO GENERATE REJECTED INSIGHTS:', {
          submissionId: report.submissionId,
          message: insightError.message,
        });
        // Fallback: keep original report but with updated insights, preserve capability traits
        updateData.evaluatorComment = evaluatorComment;
        updateData.reportData = {
          ...report.reportData,
          capabilityTraits: report.reportData.capabilityTraits || [],
        };
      }
    }

    const updated = await prisma.evaluationReport.update({ where: { id: Number(reportId) }, data: updateData });

    console.log('APPROVAL SAVED', { reportId: updated.id, status: updated.status, submissionId: updated.submissionId });

    if (normalized === 'APPROVE') {
      try {
        console.log('CANDIDATE EMAIL STARTED', { reportId: updated.id, submissionId: updated.submissionId });
        const emailResult = await sendReportEmailToCandidate(updated, 'APPROVE');
        console.log('CANDIDATE EMAIL SENT', emailResult);
      } catch (emailError) {
        console.error('CANDIDATE EMAIL FAILED', {
          reportId: updated.id,
          submissionId: updated.submissionId,
          message: emailError.message,
        });
      }
    }

    if (normalized === 'REJECT') {
      try {
        console.log('CANDIDATE EMAIL STARTED FOR REJECTION', { reportId: updated.id, submissionId: updated.submissionId });
        const emailResult = await sendReportEmailToCandidate(updated, 'REJECT');
        console.log('CANDIDATE EMAIL SENT FOR REJECTION', emailResult);
      } catch (emailError) {
        console.error('CANDIDATE EMAIL FAILED FOR REJECTION', {
          reportId: updated.id,
          submissionId: updated.submissionId,
          message: emailError.message,
        });
      }
    }

    if (normalized === 'MODIFY') {
      try {
        console.log('CANDIDATE EMAIL STARTED FOR MODIFICATION', { reportId: updated.id, submissionId: updated.submissionId });
        const emailResult = await sendReportEmailToCandidate(updated, 'MODIFY');
        console.log('CANDIDATE EMAIL SENT FOR MODIFICATION', emailResult);
      } catch (emailError) {
        console.error('CANDIDATE EMAIL FAILED FOR MODIFICATION', {
          reportId: updated.id,
          submissionId: updated.submissionId,
          message: emailError.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, report: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('REPORT REVIEW ERROR:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
