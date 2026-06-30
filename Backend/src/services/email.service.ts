import { Resend } from "resend";

import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

const log = logger.child("email-service");

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

class ResendTransport implements EmailTransport {
  private client: Resend | null = null;
  private logOnly: boolean;

  constructor() {
    this.logOnly = !env.RESEND_API_KEY || env.EMAIL_LOG_ONLY === "true";
    if (env.RESEND_API_KEY && !this.logOnly) {
      this.client = new Resend(env.RESEND_API_KEY);
    }
  }

  async send(message: EmailMessage): Promise<void> {
    if (this.logOnly || !this.client) {
      log.info("email[log-only] queued", {
        subject: message.subject,
        to: message.to,
        bodyLength: message.text.length,
      });
      return;
    }

    try {
      const result = await this.client.emails.send({
        from: `Bioma <${env.EMAIL_FROM}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      if (result.error) {
        throw new AppError("Email provider rejected the request.", {
          statusCode: 502,
          code: "EMAIL_PROVIDER_ERROR",
          cause: result.error,
        });
      }
      log.info("email delivered", { subject: message.subject });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to deliver transactional email.", {
        statusCode: 502,
        code: "EMAIL_DELIVERY_FAILED",
        cause: error,
      });
    }
  }
}

class ConsoleTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    log.info("email[console] queued", {
      subject: message.subject,
      to: message.to,
      bodyLength: message.text.length,
    });
  }
}

export function createEmailTransport(): EmailTransport {
  if (env.EMAIL_LOG_ONLY === "true" || !env.RESEND_API_KEY) {
    return new ConsoleTransport();
  }
  return new ResendTransport();
}

export function renderEmailShell(opts: {
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): { html: string; text: string } {
  const { title, body, ctaUrl, ctaLabel } = opts;
  const text = [
    title,
    "",
    body,
    ctaUrl ? `\n${ctaLabel ?? "Abrir Bioma"}: ${ctaUrl}` : "",
    "",
    "— Equipo Bioma",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F4FBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0E2A22;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4FBF7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border-radius:16px;padding:32px;border:1px solid #DCEDE3;">
            <tr>
              <td>
                <div style="font-size:13px;letter-spacing:1.4px;text-transform:uppercase;color:#00C897;font-weight:700;margin-bottom:12px;">Bioma</div>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0E2A22;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3A4A44;white-space:pre-line;">${escapeHtml(body)}</p>
                ${
                  ctaUrl
                    ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#00C897;color:#FFFFFF;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;">${escapeHtml(ctaLabel ?? "Abrir Bioma")}</a>`
                    : ""
                }
                <p style="margin:24px 0 0;font-size:13px;color:#6B7A75;">Si no solicitaste este correo puedes ignorarlo.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#8AA199;">© ${new Date().getFullYear()} Bioma</p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}