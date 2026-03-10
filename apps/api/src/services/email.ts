/**
 * Email service with a swappable provider interface.
 *
 * When RESEND_API_KEY is set, emails are sent via Resend.
 * Otherwise, emails are logged to the console (dev fallback).
 */

import { Resend } from 'resend';
import { logger } from './logger.js';

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    logger.info({ to, subject, body: html }, 'Email sent (dev console provider)');
  }
}

class ResendEmailProvider implements EmailProvider {
  private client: Resend;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is required for ResendEmailProvider');
    this.client = new Resend(apiKey);
    this.from = process.env.EMAIL_FROM || 'AuditKit <noreply@auditkit.com>';
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const { data, error } = await this.client.emails.send({ from: this.from, to, subject, html });
    if (error) {
      logger.error({ error, to, subject }, 'Resend email failed');
      throw new Error(`Email send failed: ${error.message}`);
    }
    logger.info({ id: data?.id, to }, 'Email sent via Resend');
  }
}

export class EmailService {
  constructor(private provider: EmailProvider) {}

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your AuditKit password';
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Reset your password</h2>
        <p>You requested a password reset for your AuditKit account.</p>
        <p>Click the link below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `.trim();

    await this.provider.sendEmail(to, subject, html);
  }

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    const subject = 'Verify your AuditKit email';
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Verify your email</h2>
        <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">If you didn't create an AuditKit account, you can safely ignore this email.</p>
      </div>
    `.trim();

    await this.provider.sendEmail(to, subject, html);
  }

  async sendTeamInviteEmail(to: string, inviterName: string, projectName: string, inviteUrl: string): Promise<void> {
    const subject = `You've been invited to ${projectName} on AuditKit`;
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Team Invitation</h2>
        <p>${inviterName} has invited you to join <strong>${projectName}</strong> on AuditKit.</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
      </div>
    `.trim();
    await this.provider.sendEmail(to, subject, html);
  }
}

function createEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailProvider();
  }
  if (process.env.NODE_ENV === 'production') {
    logger.warn('RESEND_API_KEY is not set. Emails will be logged to console only.');
  }
  return new ConsoleEmailProvider();
}

export const emailService = new EmailService(createEmailProvider());
