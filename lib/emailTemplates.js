// lib/emailTemplates.js

export function assessmentSubmissionEmailTemplate(candidateName, candidateCode, submissionDate, submissionTime) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background: linear-gradient(135deg, #0f1623 0%, #121826 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background-color: white; padding: 30px; }
          .detail-row { margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #6366F1; border-radius: 4px; }
          .detail-label { font-weight: 600; color: #666; }
          .detail-value { color: #333; margin-top: 5px; }
          .message-box { background-color: #E3F2FD; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .message-box p { margin: 0; color: #1976D2; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; background-color: #6366F1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .button:hover { background-color: #4F46E5; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Assessment Submitted Successfully</h1>
          </div>
          <div class="content">
            <p>Hi ${candidateName},</p>
            
            <p>Thank you for completing and submitting your assessment. We have received your submission successfully.</p>
            
            <div class="detail-row">
              <div class="detail-label">Candidate Name:</div>
              <div class="detail-value">${candidateName}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Candidate Code:</div>
              <div class="detail-value">${candidateCode}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Submission Date:</div>
              <div class="detail-value">${submissionDate}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Submission Time:</div>
              <div class="detail-value">${submissionTime}</div>
            </div>
            
            <div class="message-box">
              <p><strong>Status Update:</strong> Your assessment is currently under evaluation. Results will be updated on the IECBP portal within 48 hours.</p>
            </div>
            
            <p>You can track your submission status and view results once they are available by logging into your portal account.</p>
            
            <div class="button-container">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" class="button">Login to Portal</a>
            </div>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br><strong>IECBP Evaluation Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2026 IECBP. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return html;
}

export function emailVerificationSuccessTemplate(candidateName) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background: linear-gradient(135deg, #0f1623 0%, #121826 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background-color: white; padding: 30px; }
          .success-box { background-color: #F0F9FF; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px; text-align: center; }
          .success-box p { margin: 0; color: #059669; font-weight: 600; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; background-color: #6366F1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .button:hover { background-color: #4F46E5; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Email Verified Successfully</h1>
          </div>
          <div class="content">
            <p>Hi ${candidateName},</p>
            
            <div class="success-box">
              <p>Your IECBP account email has been verified successfully!</p>
            </div>
            
            <p>Your account is now fully activated. You can now log in using your credentials and access all the features of the IECBP platform.</p>
            
            <h3 style="color: #6366F1;">Next Steps:</h3>
            <ul>
              <li>Log in to your account</li>
              <li>Complete your profile (if needed)</li>
              <li>Start your assessment</li>
            </ul>
            
            <div class="button-container">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" class="button">Login to IECBP</a>
            </div>
            
            <p>If you did not create this account or have any questions, please contact our support team immediately.</p>
            
            <p>Best regards,<br><strong>IECBP Evaluation Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2026 IECBP. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return html;
}

export function passwordChangedEmailTemplate(candidateName) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background: linear-gradient(135deg, #0f1623 0%, #121826 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background-color: white; padding: 30px; }
          .warning-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .warning-box p { margin: 0; color: #D97706; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Password Changed Successfully</h1>
          </div>
          <div class="content">
            <p>Hi ${candidateName},</p>
            
            <p>Your password has been changed successfully. This change was made at ${new Date().toLocaleString()}.</p>
            
            <div class="warning-box">
              <p><strong>⚠️ Security Alert:</strong> If you did not perform this action, please contact the administrator immediately and reset your password.</p>
            </div>
            
            <h3 style="color: #6366F1;">For Your Security:</h3>
            <ul>
              <li>Remember to use a strong, unique password</li>
              <li>Never share your password with anyone</li>
              <li>Enable two-factor authentication if available</li>
              <li>Log out from all other devices if you suspect unauthorized access</li>
            </ul>
            
            <p>If you have any security concerns or did not make this change, please contact our support team immediately.</p>
            
            <p>Best regards,<br><strong>IECBP Evaluation Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2026 IECBP. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return html;
}
