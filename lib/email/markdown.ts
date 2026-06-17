import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Convert markdown body to inline-styled HTML suitable for transactional email. */
export function markdownToEmailHtml(md: string): string {
  const inner = (marked.parse(md, { async: false }) as string).trim();
  // Brutal Fruit-flavored, dark, simple wrapper.
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#1a0d15;font-family:'Helvetica Neue',Arial,sans-serif;color:#FAF7F2;line-height:1.55;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1a0d15;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#262627;border-radius:24px;">
            <tr>
              <td style="padding:32px 28px;color:#FAF7F2;font-size:15px;">
                ${inner}
                <hr style="border:0;border-top:1px solid rgba(255,158,188,0.18);margin:24px 0;" />
                <p style="margin:0;font-size:11px;color:#6B1D28;letter-spacing:0.06em;">Brutal Fruit · Milan Brunch</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** First name helper for {{first_name}} merge tag. */
export function firstNameOf(fullName: string): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

/** Replace {{first_name}} in a markdown source string. */
export function mergeFirstName(template: string, fullName: string): string {
  return template.replaceAll("{{first_name}}", firstNameOf(fullName));
}
