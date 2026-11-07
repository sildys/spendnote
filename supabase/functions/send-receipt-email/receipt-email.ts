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
  // IN: the contact hands the cash over, so the receipt reads contact -> company.
  isIncome: boolean;
  signatures: { label: string; signerName: string; partyName: string; signedAt: string }[];
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
// Recipients have no SpendNote session: the page must render from the query
// (demo mode), which it only does without txId. bootstrap and
// previewLogoInject need a logged-in opener and would leave a blank page or
// the placeholder logo. download/returnTo make the page save the PDF and close
// itself, which suits the in-app button but makes the receipt vanish for a
// recipient; they get the receipt with its Download PDF button instead.
export function normalizePdfUrl(raw: unknown): string | null {
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
  for (const key of ["txId", "bootstrap", "previewLogoInject", "download", "returnTo"]) params.delete(key);
  params.set("demo", "1");
  return `${APP_ORIGIN}/spendnote-pdf-receipt.html?${params.toString()}`;
}

// The sender's browser time zone, so the email shows the same time as the receipt page.
export function formatSignedAt(iso: unknown, timeZone: unknown): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "";
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  const tz = cleanText(timeZone, 64);
  if (tz) {
    try {
      return new Date(t).toLocaleString("en-US", { ...opts, timeZone: tz });
    } catch (_) {
      // unknown zone name: fall back to UTC below
    }
  }
  return new Date(t).toLocaleString("en-US", { ...opts, timeZone: "UTC" }) + " UTC";
}

export function isValidRecipient(email: string): boolean {
  return email.length <= 254 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email);
}

export function renderReceiptEmail(d: ReceiptEmailData): { subject: string; html: string; text: string } {
  const company = d.companyName.replace(/\s+/g, " ").trim();
  const hasCompany = Boolean(company) && company !== "—";
  const subject = hasCompany ? `Cash receipt ${d.receiptId} from ${company}` : `Cash receipt ${d.receiptId}`;
  const preheader = [hasCompany ? company : "", d.total, `Receipt ${d.receiptId}`].filter(Boolean).join(" · ");

  const label = (text: string) =>
    `<div style="font-size:11px;line-height:1.4;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px 0;">${text}</div>`;

  const itemsHtml = d.items
    .map((it) =>
      `<tr>
                      <td style="padding:10px 0;font-size:14px;line-height:1.4;color:#111111;border-bottom:1px solid #eeeeee;">${escapeHtml(it.description)}</td>
                      <td align="right" style="padding:10px 0 10px 12px;font-size:14px;line-height:1.4;color:#111111;border-bottom:1px solid #eeeeee;white-space:nowrap;">${escapeHtml(it.amount)}</td>
                    </tr>`
    )
    .join("\n                    ");

  const voidHtml = d.isVoided
    ? `
            <tr>
              <td style="padding:0 32px 8px 32px;">
                <div style="background-color:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:700;">This receipt is marked as VOID.</div>
              </td>
            </tr>`
    : "";

  const pdfButtonHtml = d.pdfUrl
    ? `
            <tr>
              <td align="center" style="padding:20px 32px 4px 32px;">
                <a href="${escapeHtml(d.pdfUrl)}" style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">View &amp; download PDF</a>
              </td>
            </tr>`
    : "";

  const fromName = d.isIncome ? d.contactName : d.companyName;
  const fromAddress = d.isIncome ? d.contactAddress : d.companyAddress;
  const toName = d.isIncome ? d.companyName : d.contactName;
  const toAddress = d.isIncome ? d.companyAddress : d.contactAddress;

  const signatureLine = (s: ReceiptEmailData["signatures"][number]) => {
    const forPart = s.partyName && s.partyName !== s.signerName ? ` · for ${s.partyName}` : "";
    return `${s.label}: ${s.signerName}${forPart} · signed on screen${s.signedAt ? ` · ${s.signedAt}` : ""}`;
  };
  const signaturesHtml = d.signatures.length
    ? `
            <tr>
              <td style="padding:20px 32px 0 32px;">
                ${label("Signatures")}
                ${d.signatures.map((s) =>
                  `<div style="font-size:14px;line-height:1.6;color:#111111;"><span style="color:#059669;font-weight:700;">&#10003;</span> ${escapeHtml(signatureLine(s))}</div>`
                ).join("\n                ")}              </td>
            </tr>`
    : "";

  const notesHtml = d.notes
    ? `
            <tr>
              <td style="padding:20px 32px 0 32px;">
                ${label("Notes")}
                <div style="background-color:#f9fafb;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.6;color:#374151;">${escapeMultiline(d.notes)}</div>
              </td>
            </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Cash Receipt</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111111;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f5f7;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background-color:#f4f5f7;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background-color:#059669;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 20px 32px;">
                ${label("Cash receipt")}
                <div style="font-size:22px;line-height:1.3;font-weight:700;color:#111111;">${escapeHtml(hasCompany ? company : "Your cash receipt")}</div>
                <div style="font-size:14px;line-height:1.5;color:#4b5563;margin-top:4px;">${hasCompany ? "sent you a receipt for cash handed over." : "A receipt for cash handed over."}</div>
              </td>
            </tr>${voidHtml}
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;background-color:#f8faf9;border:1px solid #e5e7eb;border-radius:10px;">
                  <tr>
                    <td valign="middle" style="padding:16px 18px;">
                      ${label("Total handed over")}
                      <div style="font-size:30px;line-height:1.1;font-weight:700;color:#047857;">${escapeHtml(d.total)}</div>
                    </td>
                    <td align="right" valign="middle" style="padding:16px 18px;font-size:13px;line-height:1.7;color:#4b5563;white-space:nowrap;">
                      Date: <strong style="color:#111111;">${escapeHtml(d.dateStr)}</strong><br />
                      Receipt ID: <strong style="color:#111111;">${escapeHtml(d.receiptId)}</strong><br />
                      Cash Box ID: <strong style="color:#111111;">${escapeHtml(d.cashBoxCode)}</strong>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>${pdfButtonHtml}
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="50%" valign="top" style="padding-right:12px;">
                      ${label("From")}
                      <div style="font-size:15px;line-height:1.4;font-weight:700;color:#111111;">${escapeHtml(fromName)}</div>
                      <div style="font-size:13px;line-height:1.5;color:#4b5563;margin-top:2px;">${escapeMultiline(fromAddress)}</div>
                    </td>
                    <td width="50%" valign="top" style="padding-left:12px;">
                      ${label("To")}
                      <div style="font-size:15px;line-height:1.4;font-weight:700;color:#111111;">${escapeHtml(toName)}</div>
                      <div style="font-size:13px;line-height:1.5;color:#4b5563;margin-top:2px;">${escapeMultiline(toAddress)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 8px 0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #d1d5db;">Description</td>
                    <td align="right" style="padding:0 0 8px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #d1d5db;">Amount</td>
                  </tr>
                    ${itemsHtml}
                  <tr>
                    <td style="padding:12px 0 0 0;font-size:14px;font-weight:700;color:#111111;border-top:2px solid #111111;">Total handed over</td>
                    <td align="right" style="padding:12px 0 0 12px;font-size:16px;font-weight:700;color:#111111;border-top:2px solid #111111;white-space:nowrap;">${escapeHtml(d.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>${signaturesHtml}${notesHtml}
            <tr>
              <td style="height:28px;line-height:28px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background-color:#fafafa;border-top:1px solid #eeeeee;">
                <div style="font-size:12px;line-height:1.6;color:#6b7280;">
                  Sent with <a href="https://spendnote.app/" style="color:#047857;font-weight:700;text-decoration:none;">SpendNote</a> · Proof of cash handoff for teams · Not a tax document.<br />
                  &copy; 2026 SpendNote
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
    hasCompany ? `Cash receipt from ${company}` : "Cash receipt",
    "",
    `Total handed over: ${d.total}`,
    `Date: ${d.dateStr}`,
    `Receipt ID: ${d.receiptId}`,
    `Cash Box ID: ${d.cashBoxCode}`,
    ...(d.isVoided ? ["", "This receipt is marked as VOID."] : []),
    ...(d.pdfUrl ? ["", `View & download PDF: ${d.pdfUrl}`] : []),
    "",
    `From: ${fromName}`,
    ...(fromAddress ? [fromAddress] : []),
    `To: ${toName}`,
    ...(toAddress ? [toAddress] : []),
    "",
    ...d.items.map((it) => `${it.description}: ${it.amount}`),
    ...(d.signatures.length ? ["", ...d.signatures.map(signatureLine)] : []),
    ...(d.notes ? ["", `Notes: ${d.notes}`] : []),
    "",
    "Sent with SpendNote (https://spendnote.app) - Proof of cash handoff for teams. Not a tax document.",
  ];

  return { subject, html, text: textLines.join("\n") };
}
