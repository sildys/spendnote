export type ReceiptLineItem = { description?: unknown; amount?: unknown };

export type ReceiptEmailData = {
  receiptId: string;
  cashBoxCode: string;
  dateStr: string;
  companyName: string;
  companyAddress: string;
  contactName: string;
  contactAddress: string;
  items: { description: string; amount: string }[];
  total: string;
  notes: string;
  isVoided: boolean;
  pdfUrl: string;
};

export const APP_ORIGIN = "https://spendnote.app";
const PDF_PATHS = new Set(["/spendnote-pdf-receipt.html", "/spendnote-pdf-receipt"]);
const MAX_PDF_URL_LENGTH = 6000;
const MAX_LINE_ITEMS = 5;

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const escapeMultiline = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");

export function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function formatMoney(amount: unknown, currency: string): string {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch (_) {
    return `$${value.toFixed(2)}`;
  }
}

// transaction_date is a calendar date; formatting it via Date would shift it
// by a day for users west of UTC.
export function formatReceiptDate(isoDate: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate ?? ""));
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "—";
}

const normalizeIdPrefix = (value: unknown): string => {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw || raw === "REC-" || raw === "-") return "";
  if (!/[A-Z0-9]/.test(raw)) return "";
  return raw;
};

export function buildReceiptIds(input: {
  cashBoxSequence: unknown;
  txSequenceInBox: unknown;
  snapshotPrefix: unknown;
  livePrefix: unknown;
  receiptNumber: unknown;
}): { receiptId: string; cashBoxCode: string } {
  const cbSeq = Number(input.cashBoxSequence) || 0;
  const txSeq = Number(input.txSequenceInBox) || 0;
  const snapshot = normalizeIdPrefix(input.snapshotPrefix);
  const live = normalizeIdPrefix(input.livePrefix);
  const prefix = snapshot && snapshot !== "SN" ? snapshot : (live || snapshot || "SN");
  const receiptId = cbSeq && txSeq
    ? `${prefix}${cbSeq}-${String(txSeq).padStart(3, "0")}`
    : (cleanText(input.receiptNumber, 60) || "—");
  const cashBoxCode = cbSeq ? `SN-${String(cbSeq).padStart(3, "0")}` : "—";
  return { receiptId, cashBoxCode };
}

export function buildLineItems(
  lineItems: unknown,
  fallbackDescription: unknown,
  fallbackAmount: unknown,
  currency: string,
): { description: string; amount: string }[] {
  const list = Array.isArray(lineItems) ? (lineItems as ReceiptLineItem[]) : [];
  const source = list.length ? list : [{ description: fallbackDescription, amount: fallbackAmount }];
  return source.slice(0, MAX_LINE_ITEMS).map((it) => ({
    description: cleanText(it?.description, 300) || "—",
    amount: formatMoney(it?.amount, currency),
  }));
}

// The link always points at the production receipt page, whatever origin the
// caller sent, so the email can never carry a link to another site.
export function normalizePdfUrl(raw: unknown, transactionId: string): string | null {
  const value = String(raw ?? "").trim();
  if (!value || value.length > MAX_PDF_URL_LENGTH) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (_) {
    return null;
  }
  if (!PDF_PATHS.has(parsed.pathname)) return null;
  const params = new URLSearchParams(parsed.search);
  params.set("txId", transactionId);
  return `${APP_ORIGIN}/spendnote-pdf-receipt.html?${params.toString()}`;
}

export function isValidRecipient(email: string): boolean {
  return email.length <= 254 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email);
}

export function renderReceiptEmail(d: ReceiptEmailData): { subject: string; html: string; text: string } {
  const subject = `Your Cash Receipt - ${d.receiptId}`;

  const itemsHtml = d.items
    .map((it) =>
      `<tr><td style="padding:10px 8px;font-size:13px;border-bottom:1px solid #f0f0f0;">${escapeHtml(it.description)}</td><td align="right" style="padding:10px 8px;font-size:13px;font-weight:700;border-bottom:1px solid #f0f0f0;">${escapeHtml(it.amount)}</td></tr>`
    )
    .join("");

  const notesHtml = d.notes
    ? `
                <div style="margin-top:18px;background-color:#f0f9ff;border-left:4px solid #059669;padding:14px 12px;">
                  <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#666666;margin-bottom:8px;">Notes</div>
                  <div style="font-size:13px;color:#333333;line-height:1.6;">${escapeMultiline(d.notes)}</div>
                </div>
                `
    : "";

  const voidHtml = d.isVoided
    ? `
                <div style="margin-top:18px;color:#666666;font-size:12px;">This receipt is marked as VOID.</div>
                `
    : "";

  const pdfButtonHtml = d.pdfUrl
    ? `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-top:24px;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(d.pdfUrl)}" style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;font-size:14px;font-weight:700;">Download PDF Receipt</a>
                    </td>
                  </tr>
                </table>`
    : "";

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cash Receipt</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background-color:#f5f5f5;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:600px;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:28px 24px;background-color:#059669;">
                <div style="font-size:24px;line-height:1.2;font-weight:900;color:#ffffff;margin:0;">Cash Receipt</div>
                <div style="font-size:14px;line-height:1.4;font-weight:500;color:#eafff7;margin-top:8px;">Your receipt is ready</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="font-size:12px;color:#666666;line-height:1.5;">
                      <strong style="color:#000000;">Date:</strong> ${escapeHtml(d.dateStr)}
                    </td>
                    <td align="right" style="font-size:12px;color:#666666;line-height:1.5;">
                      <strong style="color:#000000;">Cash Box ID:</strong> ${escapeHtml(d.cashBoxCode)}<br />
                      <strong style="color:#000000;">Receipt ID:</strong> ${escapeHtml(d.receiptId)}
                    </td>
                  </tr>
                </table>

                <div style="height:2px;background-color:#000000;margin:16px 0 18px 0;"></div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="50%" valign="top" style="padding-right:10px;">
                      <div style="font-size:11px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">From</div>
                      <div style="font-size:14px;font-weight:800;color:#000000;margin-bottom:4px;">${escapeHtml(d.companyName)}</div>
                      <div style="font-size:13px;color:#666666;line-height:1.5;">${escapeMultiline(d.companyAddress)}</div>
                    </td>
                    <td width="50%" valign="top" style="padding-left:10px;">
                      <div style="font-size:11px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">To</div>
                      <div style="font-size:14px;font-weight:800;color:#000000;margin-bottom:4px;">${escapeHtml(d.contactName)}</div>
                      <div style="font-size:13px;color:#666666;line-height:1.5;">${escapeMultiline(d.contactAddress)}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-top:18px;border:1px solid #e0e0e0;border-radius:8px;">
                  <tr>
                    <td style="background-color:#f8fafc;padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:#666666;border-bottom:1px solid #e0e0e0;">Description</td>
                    <td align="right" style="background-color:#f8fafc;padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:#666666;border-bottom:1px solid #e0e0e0;">Amount</td>
                  </tr>
                  ${itemsHtml}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-top:18px;">
                  <tr>
                    <td style="background-color:#059669;color:#ffffff;padding:14px 16px;border-radius:8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Total handed over</td>
                    <td align="right" style="background-color:#059669;color:#ffffff;padding:14px 16px;border-radius:8px;font-size:22px;font-weight:900;">${escapeHtml(d.total)}</td>
                  </tr>
                </table>
${notesHtml}${voidHtml}${pdfButtonHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 24px;background-color:#fafafa;border-top:1px solid #e0e0e0;">
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:10px;">SpendNote</div>
                <div style="font-size:12px;color:#999999;line-height:1.6;">
                  Proof of cash handoff. Not a tax document.<br />
                  2026 SpendNote. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    "Cash Receipt",
    "",
    `Date: ${d.dateStr}`,
    `Cash Box ID: ${d.cashBoxCode}`,
    `Receipt ID: ${d.receiptId}`,
    "",
    `From: ${d.companyName}`,
    ...(d.companyAddress ? [d.companyAddress] : []),
    `To: ${d.contactName}`,
    ...(d.contactAddress ? [d.contactAddress] : []),
    "",
    ...d.items.map((it) => `${it.description}: ${it.amount}`),
    `Total handed over: ${d.total}`,
    ...(d.notes ? ["", `Notes: ${d.notes}`] : []),
    ...(d.isVoided ? ["", "This receipt is marked as VOID."] : []),
    ...(d.pdfUrl ? ["", `Download PDF receipt: ${d.pdfUrl}`] : []),
    "",
    "SpendNote - Proof of cash handoff. Not a tax document.",
  ];

  return { subject, html, text: textLines.join("\n") };
}
