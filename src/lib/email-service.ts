import { Resend } from 'resend';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface UserInvitationEmail {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationLink: string;
  role: string;
}

export interface PasswordResetEmail {
  to: string;
  resetLink: string;
  organizationName: string;
}

export interface WelcomeEmail {
  to: string;
  userName: string;
  organizationName: string;
  dashboardLink: string;
}

export class EmailService {
  private static instance: EmailService;
  private resend: Resend;

  private constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send user invitation email
   */
  async sendUserInvitation(data: UserInvitationEmail): Promise<boolean> {
    try {
      const { to, organizationName, inviterName, invitationLink, role } = data;

      const html = this.generateInvitationEmailHTML({
        organizationName,
        inviterName,
        invitationLink,
        role,
      });

      const result = await this.resend.emails.send({
        from: 'LogosLMS <noreply@logoslms.com>',
        to: [to],
        subject: `You're invited to join ${organizationName} on LogosLMS`,
        html,
        text: this.generateInvitationEmailText({
          organizationName,
          inviterName,
          invitationLink,
          role,
        }),
      });

      return result.error === null;
    } catch (error) {
      console.error('Failed to send user invitation email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetEmail): Promise<boolean> {
    try {
      const { to, resetLink, organizationName } = data;

      const html = this.generatePasswordResetEmailHTML({
        resetLink,
        organizationName,
      });

      const result = await this.resend.emails.send({
        from: 'LogosLMS <noreply@logoslms.com>',
        to: [to],
        subject: 'Reset your LogosLMS password',
        html,
        text: this.generatePasswordResetEmailText({
          resetLink,
          organizationName,
        }),
      });

      return result.error === null;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcome(data: WelcomeEmail): Promise<boolean> {
    try {
      const { to, userName, organizationName, dashboardLink } = data;

      const html = this.generateWelcomeEmailHTML({
        userName,
        organizationName,
        dashboardLink,
      });

      const result = await this.resend.emails.send({
        from: 'LogosLMS <noreply@logoslms.com>',
        to: [to],
        subject: `Welcome to ${organizationName} on LogosLMS!`,
        html,
        text: this.generateWelcomeEmailText({
          userName,
          organizationName,
          dashboardLink,
        }),
      });

      return result.error === null;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Generate HTML for user invitation email
   */
  private generateInvitationEmailHTML(data: {
    organizationName: string;
    inviterName: string;
    invitationLink: string;
    role: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're invited to join ${data.organizationName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LogosLMS</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Learning Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">You're invited to join ${data.organizationName}</h2>
            
            <p>Hello!</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on LogosLMS as a <strong>${data.role}</strong>.</p>
            
            <p>LogosLMS is a comprehensive learning management system that provides:</p>
            <ul>
              <li>📚 Access to courses and learning materials</li>
              <li>🤖 AI-powered coaching and assistance</li>
              <li>🏆 Gamification with points and badges</li>
              <li>📊 Progress tracking and analytics</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.invitationLink}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${data.invitationLink}" style="color: #667eea;">${data.invitationLink}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This invitation was sent by ${data.inviterName} for ${data.organizationName}.<br>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate text version for user invitation email
   */
  private generateInvitationEmailText(data: {
    organizationName: string;
    inviterName: string;
    invitationLink: string;
    role: string;
  }): string {
    return `
You're invited to join ${data.organizationName}

Hello!

${data.inviterName} has invited you to join ${data.organizationName} on LogosLMS as a ${data.role}.

LogosLMS is a comprehensive learning management system that provides:
- Access to courses and learning materials
- AI-powered coaching and assistance
- Gamification with points and badges
- Progress tracking and analytics

To accept this invitation, click the link below:
${data.invitationLink}

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
The LogosLMS Team
    `.trim();
  }

  /**
   * Generate HTML for password reset email
   */
  private generatePasswordResetEmailHTML(data: {
    resetLink: string;
    organizationName: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your LogosLMS password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LogosLMS</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Learning Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Reset your password</h2>
            
            <p>Hello!</p>
            
            <p>We received a request to reset your password for your LogosLMS account in <strong>${data.organizationName}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetLink}" 
                 style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${data.resetLink}" style="color: #667eea;">${data.resetLink}</a>
            </p>
            
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn't request this password reset, you can safely ignore this email.<br>
              Your password will remain unchanged.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate text version for password reset email
   */
  private generatePasswordResetEmailText(data: {
    resetLink: string;
    organizationName: string;
  }): string {
    return `
Reset your LogosLMS password

Hello!

We received a request to reset your password for your LogosLMS account in ${data.organizationName}.

To reset your password, click the link below:
${data.resetLink}

Important: This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.
Your password will remain unchanged.

Best regards,
The LogosLMS Team
    `.trim();
  }

  /**
   * Generate HTML for welcome email
   */
  private generateWelcomeEmailHTML(data: {
    userName: string;
    organizationName: string;
    dashboardLink: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to LogosLMS!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to LogosLMS!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Learning Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Welcome, ${data.userName}!</h2>
            
            <p>Congratulations! Your account has been successfully created and you're now part of <strong>${data.organizationName}</strong> on LogosLMS.</p>
            
            <p>Here's what you can do next:</p>
            <ul>
              <li>📚 Browse and enroll in available courses</li>
              <li>🤖 Get AI-powered coaching and learning assistance</li>
              <li>🏆 Earn points and badges as you progress</li>
              <li>📊 Track your learning progress and achievements</li>
              <li>👥 Connect with other learners in your organization</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardLink}" 
                 style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${data.dashboardLink}" style="color: #667eea;">${data.dashboardLink}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Need help getting started? Contact your organization administrator or visit our help center.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate text version for welcome email
   */
  private generateWelcomeEmailText(data: {
    userName: string;
    organizationName: string;
    dashboardLink: string;
  }): string {
    return `
Welcome to LogosLMS!

Welcome, ${data.userName}!

Congratulations! Your account has been successfully created and you're now part of ${data.organizationName} on LogosLMS.

Here's what you can do next:
- Browse and enroll in available courses
- Get AI-powered coaching and learning assistance
- Earn points and badges as you progress
- Track your learning progress and achievements
- Connect with other learners in your organization

To get started, visit your dashboard:
${data.dashboardLink}

Need help getting started? Contact your organization administrator or visit our help center.

Best regards,
The LogosLMS Team
    `.trim();
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
