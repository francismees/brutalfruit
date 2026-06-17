import { Resend } from "resend";
import {
  EMAIL_SUBJECT,
  DRESS_CODE,
  EVENT_DISPLAY,
  EVENT_FULL_ADDRESS,
  EVENT_VENUE,
  confirmationUrl,
  siteUrl,
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
 * Send the post-RSVP confirmation email. Light blush palette + GT-style
 * italic serif to mirror the on-page confirmation ticket — door check-in
 * is manual, so no QR is rendered.
 */
export async function sendConfirmationEmail({
  to,
  name,
  qr_token,
}: SendConfirmationEmailParams): Promise<{ id: string }> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not configured");

  const artworkUrl = siteUrl("/milan-brunch/artwork.jpg");
  const wordmarkUrl = siteUrl("/milan-brunch/brutalfruit-wordmark-pink.svg");
  const confirmUrl = confirmationUrl(qr_token);
  const html = buildHtml({ name, artworkUrl, wordmarkUrl, confirmUrl });
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
  artworkUrl: string;
  wordmarkUrl: string;
  confirmUrl: string;
}

function buildHtml({ name, artworkUrl, wordmarkUrl, confirmUrl }: HtmlParams): string {
  // Web-safe serif (Georgia) approximates GT Super for email clients that
  // strip custom fonts. Helvetica Neue / Arial for labels.
  const SERIF = "'Georgia', 'Times New Roman', serif";
  const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(EMAIL_SUBJECT_FOR_PREVIEW)}</title>
  </head>
  <body style="margin:0;padding:0;background:#FDF8F4;font-family:${SANS};color:#262627;-webkit-font-smoothing:antialiased;">
    <span style="display:none;font-size:0;line-height:0;color:#FDF8F4;opacity:0;">You're in for Brutal Fruit Milan Brunch — see you at Karambezi Café on Saturday 20 June.</span>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FDF8F4;">
      <tr>
        <td align="center" style="padding:40px 16px 8px;">
          <img src="${wordmarkUrl}" alt="BRUTAL FRUIT" width="160" style="display:block;width:160px;max-width:60%;height:auto;" />
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:24px 24px 0;">
          <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#BA3E4D;font-weight:600;">RSVP Confirmed</p>
          <h1 style="margin:14px 0 0;font-family:${SERIF};font-style:italic;font-weight:400;font-size:44px;line-height:1.12;color:#262627;letter-spacing:-0.01em;">You&rsquo;re in, bestie.</h1>
          <p style="margin:18px 0 0;font-family:${SERIF};font-size:16px;line-height:1.55;color:#4A4A4B;">
            ${escapeHtml(EVENT_VENUE)} &middot; Saturday 20 June &middot; 11am
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:32px 16px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;background:#FFFFFF;border:1px solid rgba(212,212,213,0.5);border-radius:24px;">
            <tr>
              <td style="padding:16px;">
                <img src="${artworkUrl}" alt="Brunch with Brutal Fruit" width="448" style="display:block;width:100%;max-width:448px;height:auto;border-radius:16px;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:24px 16px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;background:#FFFFFF;border:1px solid rgba(212,212,213,0.5);border-radius:24px;">
            <tr>
              <td style="padding:28px 28px 24px;">
                <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9B9C;font-weight:500;">Venue</p>
                <p style="margin:0;font-family:${SANS};font-size:15px;color:#262627;">${escapeHtml(EVENT_VENUE)}</p>
                <p style="margin:2px 0 18px;font-family:${SANS};font-size:13px;color:#4A4A4B;">${escapeHtml(EVENT_FULL_ADDRESS)}</p>

                <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9B9C;font-weight:500;">When</p>
                <p style="margin:0 0 18px;font-family:${SANS};font-size:15px;color:#262627;">${escapeHtml(EVENT_DISPLAY)}</p>

                <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9B9C;font-weight:500;">Dress code</p>
                <p style="margin:0;font-family:${SANS};font-size:15px;color:#262627;">${escapeHtml(DRESS_CODE)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:28px 16px 8px;">
          <a href="${confirmUrl}" style="display:inline-block;background:#F2688E;background-image:linear-gradient(135deg,#FF9EBC 0%,#F2688E 100%);color:#FFFFFF;text-decoration:none;font-family:${SANS};font-size:13px;letter-spacing:0.08em;text-transform:uppercase;padding:14px 32px;border-radius:999px;font-weight:600;">Open my confirmation</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:8px 24px 0;">
          <p style="margin:16px 0 0;font-family:${SANS};font-size:12px;color:#9B9B9C;line-height:1.55;">
            Lost this email? Re-open from <a href="${confirmUrl}" style="color:#BA3E4D;text-decoration:underline;">${escapeHtml(confirmUrl)}</a>.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:40px 24px 48px;">
          <p style="margin:0;font-family:${SANS};font-size:11px;color:#9B9B9C;letter-spacing:0.04em;line-height:1.6;">
            &copy; 2026 Brutal Fruit.<br />
            Not For Persons Under the Age of 18.<br />
            Please Enjoy Brutal Fruit Responsibly.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const EMAIL_SUBJECT_FOR_PREVIEW = "You're in for Brutal Fruit Milan Brunch";

function buildText({ name, confirmUrl }: { name: string; confirmUrl: string }): string {
  const firstName = name.split(/\s+/)[0] || name;
  return [
    `${firstName}, you're in for Brutal Fruit Milan Brunch.`,
    "",
    `Venue: ${EVENT_VENUE}`,
    `       ${EVENT_FULL_ADDRESS}`,
    `When:  ${EVENT_DISPLAY}`,
    `Dress: ${DRESS_CODE}`,
    "",
    "Open your confirmation:",
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
