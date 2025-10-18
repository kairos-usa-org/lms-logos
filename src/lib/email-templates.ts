import {
  emailService,
  UserInvitationEmail,
  PasswordResetEmail,
  WelcomeEmail,
} from './email-service';

/**
 * Email template utilities for LogosLMS
 * Provides pre-configured email templates for common scenarios
 */

export class EmailTemplates {
  /**
   * Send user invitation email with organization branding
   */
  static async sendUserInvitation(data: {
    to: string;
    organizationName: string;
    inviterName: string;
    invitationLink: string;
    role: 'org_admin' | 'mentor' | 'learner';
  }): Promise<boolean> {
    const roleDisplayNames = {
      org_admin: 'Organization Administrator',
      mentor: 'Mentor',
      learner: 'Learner',
    };

    const invitationData: UserInvitationEmail = {
      to: data.to,
      organizationName: data.organizationName,
      inviterName: data.inviterName,
      invitationLink: data.invitationLink,
      role: roleDisplayNames[data.role],
    };

    return await emailService.sendUserInvitation(invitationData);
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(data: {
    to: string;
    resetLink: string;
    organizationName: string;
  }): Promise<boolean> {
    const resetData: PasswordResetEmail = {
      to: data.to,
      resetLink: data.resetLink,
      organizationName: data.organizationName,
    };

    return await emailService.sendPasswordReset(resetData);
  }

  /**
   * Send welcome email for new users
   */
  static async sendWelcome(data: {
    to: string;
    userName: string;
    organizationName: string;
    dashboardLink: string;
  }): Promise<boolean> {
    const welcomeData: WelcomeEmail = {
      to: data.to,
      userName: data.userName,
      organizationName: data.organizationName,
      dashboardLink: data.dashboardLink,
    };

    return await emailService.sendWelcome(welcomeData);
  }

  /**
   * Send course enrollment confirmation
   */
  static async sendCourseEnrollment(data: {
    to: string;
    userName: string;
    courseTitle: string;
    organizationName: string;
    courseLink: string;
  }): Promise<boolean> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Enrollment Confirmation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">LogosLMS</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Learning Management System</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">You're enrolled in "${data.courseTitle}"</h2>
              
              <p>Hello ${data.userName}!</p>
              
              <p>Great news! You've successfully enrolled in <strong>"${data.courseTitle}"</strong> in ${data.organizationName}.</p>
              
              <p>You can now:</p>
              <ul>
                <li>📖 Access course materials and lessons</li>
                <li>📝 Take quizzes and assessments</li>
                <li>🤖 Get AI-powered learning assistance</li>
                <li>🏆 Earn points and badges for your progress</li>
                <li>📊 Track your learning journey</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.courseLink}" 
                   style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Start Learning
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${data.courseLink}" style="color: #667eea;">${data.courseLink}</a>
              </p>
            </div>
          </body>
        </html>
      `;

      const text = `
You're enrolled in "${data.courseTitle}"

Hello ${data.userName}!

Great news! You've successfully enrolled in "${data.courseTitle}" in ${data.organizationName}.

You can now:
- Access course materials and lessons
- Take quizzes and assessments
- Get AI-powered learning assistance
- Earn points and badges for your progress
- Track your learning journey

To start learning, visit: ${data.courseLink}

Best regards,
The LogosLMS Team
      `.trim();

      const result = await emailService['resend'].emails.send({
        from: 'LogosLMS <noreply@logoslms.com>',
        to: [data.to],
        subject: `You're enrolled in "${data.courseTitle}"`,
        html,
        text,
      });

      return result.error === null;
    } catch (error) {
      console.error('Failed to send course enrollment email:', error);
      return false;
    }
  }

  /**
   * Send course completion certificate
   */
  static async sendCourseCompletion(data: {
    to: string;
    userName: string;
    courseTitle: string;
    organizationName: string;
    certificateLink: string;
    pointsEarned: number;
  }): Promise<boolean> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Completion Certificate</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Course Completed Successfully</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">You've completed "${data.courseTitle}"!</h2>
              
              <p>Hello ${data.userName}!</p>
              
              <p>Congratulations! You've successfully completed <strong>"${data.courseTitle}"</strong> in ${data.organizationName}.</p>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <h3 style="margin: 0 0 10px 0; color: #28a745;">🏆 Achievement Unlocked!</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold;">+${data.pointsEarned} Points Earned</p>
              </div>
              
              <p>Your dedication to learning has paid off! You can now:</p>
              <ul>
                <li>📜 Download your completion certificate</li>
                <li>🏆 View your new badges and achievements</li>
                <li>📊 Check your updated progress dashboard</li>
                <li>📚 Explore more courses to continue learning</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.certificateLink}" 
                   style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Download Certificate
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${data.certificateLink}" style="color: #667eea;">${data.certificateLink}</a>
              </p>
            </div>
          </body>
        </html>
      `;

      const text = `
🎉 Congratulations! You've completed "${data.courseTitle}"!

Hello ${data.userName}!

Congratulations! You've successfully completed "${data.courseTitle}" in ${data.organizationName}.

🏆 Achievement Unlocked!
+${data.pointsEarned} Points Earned

Your dedication to learning has paid off! You can now:
- Download your completion certificate
- View your new badges and achievements
- Check your updated progress dashboard
- Explore more courses to continue learning

To download your certificate, visit: ${data.certificateLink}

Best regards,
The LogosLMS Team
      `.trim();

      const result = await emailService['resend'].emails.send({
        from: 'LogosLMS <noreply@logoslms.com>',
        to: [data.to],
        subject: `🎉 Congratulations! You've completed "${data.courseTitle}"`,
        html,
        text,
      });

      return result.error === null;
    } catch (error) {
      console.error('Failed to send course completion email:', error);
      return false;
    }
  }
}

export default EmailTemplates;
