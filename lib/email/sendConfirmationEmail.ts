import { Resend } from "resend";
import QRCode from "qrcode";
import {
  EMAIL_SUBJECT,
  EVENT_DISPLAY,
  EVENT_FULL_ADDRESS,
  EVENT_VENUE,
  confirmationUrl,
} from "@/lib/milan-brunch/config";

interface SendConfirmationEmailParams {
  to: string;
  name: string;
  qr_token: string;
}

let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

/**
 * Send the post-RSVP confirmation email. Generates the QR PNG inline so the
 * door check-in works offline straight from the inbox.
 */
export async function sendConfirmationEmail({
  to,
  name,
  qr_token,
}: SendConfirmationEmailParams): Promise<{ id: string }> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not configured");

  const qrDataUrl = await QRCode.toDataURL(qr_token, {
    margin: 1,
    width: 480,
    color: { dark: "#262627", light: "#FFFFFF" },
  });

  const confirmUrl = confirmationUrl(qr_token);
  const html = buildHtml({ name, qrDataUrl, confirmUrl });
  const text = buildText({ name, confirmUrl });

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: EMAIL_SUBJECT,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message ?? "unknown error"}`);
  }
  return { id: data?.id ?? "" };
}

interface HtmlParams {
  name: string;
  qrDataUrl: string;
  confirmUrl: string;
}

function buildHtml({ name, qrDataUrl, confirmUrl }: HtmlParams): string {
  const firstName = name.split(/\s+/)[0] || name;
  // Dark Brutal Fruit palette — sans-serif body — embedded QR PNG via data URL.
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#1a0d15;font-family:'Helvetica Neue',Arial,sans-serif;color:#FAF7F2;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1a0d15;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#262627;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:48px 32px 24px;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#FF9EBC;">Brutal Fruit · Milan Brunch</p>
                <h1 style="margin:8px 0 0;font-size:32px;line-height:1.15;font-weight:400;color:#FAF7F2;">You're in, bestie.</h1>
                <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#D4D4D5;">
                  ${escapeHtml(firstName)}, your seat at ${escapeHtml(EVENT_VENUE)} is locked in. Show this QR at the door — that's all we need.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 32px 8px;">
                <img src="${qrDataUrl}" alt="Your check-in QR code" width="240" height="240" style="display:block;background:#FFFFFF;border-radius:16px;padding:16px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;text-align:center;">
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9B9B9C;">Save the moment</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1a0d15;border:1px solid rgba(255,158,188,0.18);border-radius:16px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#FF9EBC;">Venue</p>
                      <p style="margin:0 0 16px;font-size:15px;color:#FAF7F2;">${escapeHtml(EVENT_VENUE)}<br /><span style="color:#9B9B9C;font-size:13px;">${escapeHtml(EVENT_FULL_ADDRESS)}</span></p>
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#FF9EBC;">When</p>
                      <p style="margin:0 0 16px;font-size:15px;color:#FAF7F2;">${escapeHtml(EVENT_DISPLAY)}</p>
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#FF9EBC;">Dress code</p>
                      <p style="margin:0;font-size:15px;color:#FAF7F2;">Bring your softest brunch energy.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 40px;">
                <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF9EBC 0%,#F2688E 100%);color:#FFFFFF;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;padding:14px 28px;border-radius:999px;font-weight:500;">View my QR online</a>
                <p style="margin:24px 0 0;font-size:12px;color:#9B9B9C;line-height:1.5;">
                  Lost this email? Re-open it from <a href="${confirmUrl}" style="color:#FF9EBC;text-decoration:underline;">${escapeHtml(confirmUrl)}</a>.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 16px 0;font-size:11px;color:#6B1D28;letter-spacing:0.06em;">Not For Persons Under the Age of 18. Please Enjoy Brutal Fruit Responsibly.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildText({ name, confirmUrl }: { name: string; confirmUrl: string }): string {
  const firstName = name.split(/\s+/)[0] || name;
  return [
    `${firstName}, you're in for Brutal Fruit Milan Brunch.`,
    "",
    `Venue: ${EVENT_VENUE}`,
    `       ${EVENT_FULL_ADDRESS}`,
    `When:  ${EVENT_DISPLAY}`,
    "",
    "Show the QR at the door. If this email is hard to read, view your QR online:",
    confirmUrl,
    "",
    "Not For Persons Under the Age of 18. Please Enjoy Brutal Fruit Responsibly.",
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
