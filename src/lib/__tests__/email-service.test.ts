import { EmailService, emailService } from '../email-service';

// Mock Resend
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ error: null }),
      },
    })),
  };
});

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EmailService.getInstance();
      const instance2 = EmailService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendUserInvitation', () => {
    it('should send user invitation email successfully', async () => {
      const mockData = {
        to: 'test@example.com',
        organizationName: 'Test Organization',
        inviterName: 'John Doe',
        invitationLink: 'https://example.com/invite/123',
        role: 'Learner',
      };

      const result = await emailService.sendUserInvitation(mockData);
      expect(result).toBe(true);
    });

    it('should handle email sending errors', async () => {
      // Mock Resend to throw an error
      const mockResend = require('resend');
      mockResend.Resend.mockImplementation(() => ({
        emails: {
          send: jest.fn().mockRejectedValue(new Error('Email sending failed')),
        },
      }));

      const emailService = new EmailService();
      const mockData = {
        to: 'test@example.com',
        organizationName: 'Test Organization',
        inviterName: 'John Doe',
        invitationLink: 'https://example.com/invite/123',
        role: 'Learner',
      };

      const result = await emailService.sendUserInvitation(mockData);
      expect(result).toBe(false);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      const mockData = {
        to: 'test@example.com',
        resetLink: 'https://example.com/reset/123',
        organizationName: 'Test Organization',
      };

      const result = await emailService.sendPasswordReset(mockData);
      expect(result).toBe(true);
    });
  });

  describe('sendWelcome', () => {
    it('should send welcome email successfully', async () => {
      const mockData = {
        to: 'test@example.com',
        userName: 'John Doe',
        organizationName: 'Test Organization',
        dashboardLink: 'https://example.com/dashboard',
      };

      const result = await emailService.sendWelcome(mockData);
      expect(result).toBe(true);
    });
  });

  describe('Email Content Generation', () => {
    it('should generate valid HTML for invitation email', () => {
      const emailService = new EmailService();
      const data = {
        organizationName: 'Test Organization',
        inviterName: 'John Doe',
        invitationLink: 'https://example.com/invite/123',
        role: 'Learner',
      };

      // Access private method for testing
      const html = (emailService as any).generateInvitationEmailHTML(data);

      expect(html).toContain('Test Organization');
      expect(html).toContain('John Doe');
      expect(html).toContain('https://example.com/invite/123');
      expect(html).toContain('Learner');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should generate valid text for invitation email', () => {
      const emailService = new EmailService();
      const data = {
        organizationName: 'Test Organization',
        inviterName: 'John Doe',
        invitationLink: 'https://example.com/invite/123',
        role: 'Learner',
      };

      // Access private method for testing
      const text = (emailService as any).generateInvitationEmailText(data);

      expect(text).toContain('Test Organization');
      expect(text).toContain('John Doe');
      expect(text).toContain('https://example.com/invite/123');
      expect(text).toContain('Learner');
    });
  });
});
