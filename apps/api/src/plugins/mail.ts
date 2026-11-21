import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Env } from '../env.js';

export type EmailTokenKind = 'verify_email' | 'reset_password';

export interface MailMessage {
  type: EmailTokenKind;
  to: string;
  subject: string;
  text: string;
  html: string;
  token: string;
  url: string;
}

export interface SendEmailInput {
  email: string;
  token: string;
  url: string;
}

export interface MailProvider {
  sendVerificationEmail(input: SendEmailInput): Promise<void>;
  sendPasswordResetEmail(input: SendEmailInput): Promise<void>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function emailHtml(title: string, body: string, url: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:32px;background:#f6f6f6;font-family:system-ui,sans-serif;color:#18181b">
    <div style="max-width:560px;margin:0 auto;border-radius:12px;background:#fff;padding:32px">
      <h1 style="margin:0 0 16px;font-size:24px">${escapeHtml(title)}</h1>
      <p style="margin:0 0 24px;line-height:1.5">${escapeHtml(body)}</p>
      <a href="${escapeHtml(url)}" style="display:inline-block;border-radius:8px;background:#18181b;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">Continue</a>
      <p style="margin:24px 0 0;color:#71717a;font-size:13px;line-height:1.5">If the button does not work, copy this link into your browser:<br />${escapeHtml(url)}</p>
    </div>
  </body>
</html>`;
}

export class TestMailProvider implements MailProvider {
  readonly messages: MailMessage[] = [];

  private record(type: EmailTokenKind, input: SendEmailInput, subject: string, body: string) {
    this.messages.push({
      type,
      to: input.email,
      subject,
      text: `${body}\n\n${input.url}`,
      html: emailHtml(subject, body, input.url),
      token: input.token,
      url: input.url,
    });
  }

  async sendVerificationEmail(input: SendEmailInput): Promise<void> {
    this.record(
      'verify_email',
      input,
      'Verify your Reel email',
      'Confirm your email address to finish setting up your Reel account.',
    );
  }

  async sendPasswordResetEmail(input: SendEmailInput): Promise<void> {
    this.record(
      'reset_password',
      input,
      'Reset your Reel password',
      'Use this one-time link to choose a new password. It expires in 30 minutes.',
    );
  }
}

export class NodemailerMailProvider implements MailProvider {
  private readonly transporter: Transporter;

  constructor(private readonly config: Env) {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth:
        config.SMTP_USER && config.SMTP_PASSWORD
          ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
          : undefined,
    });
  }

  private async send(input: SendEmailInput, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.SMTP_FROM,
      to: input.email,
      subject,
      text: `${body}\n\n${input.url}`,
      html: emailHtml(subject, body, input.url),
      signal: AbortSignal.timeout(10_000),
    });
  }

  async sendVerificationEmail(input: SendEmailInput): Promise<void> {
    await this.send(
      input,
      'Verify your Reel email',
      'Confirm your email address to finish setting up your Reel account.',
    );
  }

  async sendPasswordResetEmail(input: SendEmailInput): Promise<void> {
    await this.send(
      input,
      'Reset your Reel password',
      'Use this one-time link to choose a new password. It expires in 30 minutes.',
    );
  }
}

export const mailPlugin = fp(async (app) => {
  let provider: MailProvider;
  let testProvider: TestMailProvider | null = null;
  if (app.config.NODE_ENV === 'test') {
    testProvider = new TestMailProvider();
    provider = testProvider;
  } else {
    provider = new NodemailerMailProvider(app.config);
  }
  app.decorate('mail', provider);
  if (testProvider) Object.assign(app, { testMail: testProvider });
});
