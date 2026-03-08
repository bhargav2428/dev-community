// Email Service
// Handles sending transactional emails using Nodemailer

import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

// Email templates
const templates = {
  verification: (link: string) => ({
    subject: 'Verify your DevConnect email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .footer { text-align: center; padding: 20px 0; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DevConnect</div>
          </div>
          <div class="content">
            <h2>Verify your email address</h2>
            <p>Thanks for signing up for DevConnect! Please verify your email address by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${link}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6366f1;">${link}</p>
            <p>This link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} DevConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  passwordReset: (link: string) => ({
    subject: 'Reset your DevConnect password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .footer { text-align: center; padding: 20px 0; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DevConnect</div>
          </div>
          <div class="content">
            <h2>Reset your password</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${link}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6366f1;">${link}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email or contact support.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DevConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcome: (name: string) => ({
    subject: 'Welcome to DevConnect!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .features { margin: 20px 0; }
          .feature { display: flex; align-items: flex-start; margin: 15px 0; }
          .feature-icon { font-size: 24px; margin-right: 15px; }
          .footer { text-align: center; padding: 20px 0; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DevConnect</div>
          </div>
          <div class="content">
            <h2>Welcome to DevConnect, ${name}! 🎉</h2>
            <p>You've joined a community of developers building the future together.</p>
            
            <div class="features">
              <div class="feature">
                <span class="feature-icon">🚀</span>
                <div>
                  <strong>Showcase Your Projects</strong>
                  <p>Share what you're building and get feedback from the community.</p>
                </div>
              </div>
              <div class="feature">
                <span class="feature-icon">🤝</span>
                <div>
                  <strong>Find Collaborators</strong>
                  <p>Connect with developers who share your vision and skills.</p>
                </div>
              </div>
              <div class="feature">
                <span class="feature-icon">💡</span>
                <div>
                  <strong>Discover Opportunities</strong>
                  <p>Find your next startup, project, or career opportunity.</p>
                </div>
              </div>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${config.server.clientUrl}/dashboard" class="button">Complete Your Profile</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DevConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  projectInvitation: (projectName: string, inviterName: string, link: string) => ({
    subject: `You're invited to join ${projectName} on DevConnect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .project-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DevConnect</div>
          </div>
          <div class="content">
            <h2>You've been invited!</h2>
            <p><strong>${inviterName}</strong> has invited you to join their project on DevConnect:</p>
            
            <div class="project-card">
              <h3 style="margin: 0 0 10px 0;">${projectName}</h3>
              <p style="margin: 0; color: #6b7280;">Click below to view the project and accept the invitation.</p>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${link}" class="button">View Invitation</a>
            </p>
            <p>This invitation will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DevConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    // Check feature flag first
    if (!config.features.email) {
      logger.info('Email service disabled (ENABLE_EMAIL=false)');
      return;
    }

    if (!config.email.host || !config.email.user) {
      logger.warn('Email service not configured - emails will be logged only');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port || 587,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    this.enabled = true;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    // Enqueue email job
    const { emailQueue } = await import('./queue.js');
    await emailQueue.add('send', { to, subject, html });
    logger.info('Email job enqueued', { to, subject });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${config.server.clientUrl}/verify-email?token=${token}`;
    const { subject, html } = templates.verification(link);
    await this.send(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${config.server.clientUrl}/reset-password?token=${token}`;
    const { subject, html } = templates.passwordReset(link);
    await this.send(email, subject, html);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const { subject, html } = templates.welcome(name);
    await this.send(email, subject, html);
  }

  async sendProjectInvitation(
    email: string,
    projectName: string,
    inviterName: string,
    token: string
  ): Promise<void> {
    const link = `${config.server.clientUrl}/invitations/${token}`;
    const { subject, html } = templates.projectInvitation(projectName, inviterName, link);
    await this.send(email, subject, html);
  }
}

export const emailService = new EmailService();
