import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Outbound email over SMTP (any provider: SES, Mailgun, Gmail, Postmark…).
 *
 * Configured from SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM.
 * Without SMTP_HOST, development logs each message instead of sending it;
 * production refuses to boot, so a live store never silently drops receipts
 * and password resets.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from =
    process.env.SMTP_FROM ?? 'Royal Zaad <no-reply@localhost>';

  get isConfigured(): boolean {
    return !!process.env.SMTP_HOST;
  }

  onModuleInit() {
    if (!this.isConfigured) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMTP_HOST must be set in production');
      }
      this.logger.warn('SMTP_HOST not set — emails will be logged, not sent');
      return;
    }

    const port = Number(process.env.SMTP_PORT ?? 587);
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  /**
   * Sends without ever throwing: a mail outage must not fail the checkout or
   * payment that triggered it.
   */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(
        `[mail:dev] to=${message.to} subject="${message.subject}"\n${message.text}`,
      );
      return false;
    }

    try {
      await this.transporter.sendMail({ from: this.from, ...message });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send "${message.subject}" to ${message.to}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** A minimal branded layout shared by every transactional email. */
  layout(heading: string, paragraphs: string[], cta?: { label: string; url: string }) {
    const body = paragraphs
      .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p)}</p>`)
      .join('');
    const button = cta
      ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="background:#1c1a17;color:#f6f1e7;padding:12px 22px;text-decoration:none;font-weight:bold">${escapeHtml(cta.label)}</a></p>`
      : '';

    const html = `<!doctype html><html><body style="margin:0;background:#f6f1e7;font-family:Helvetica,Arial,sans-serif;color:#1c1a17"><div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff"><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 20px">${escapeHtml(heading)}</h1>${body}${button}</div></body></html>`;
    const text = [heading, '', ...paragraphs, ...(cta ? ['', `${cta.label}: ${cta.url}`] : [])].join('\n');

    return { html, text };
  }

  /** Public URL of the storefront, used for links inside emails. */
  appUrl(path: string): string {
    const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${base}${path}`;
  }
}
