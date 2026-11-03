import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildLineItems,
  buildReceiptIds,
  cleanText,
  formatMoney,
  formatReceiptDate,
  isValidRecipient,
  normalizePdfUrl,
  renderReceiptEmail,
} from "./receipt-email.ts";

type ReceiptEmailBody = {
  transactionId?: string;
  to?: string;
  pdfUrl?: string;
  companyNameFallback?: string;
  companyAddressFallback?: string;
};

type TxRow = {
  id: string;
  org_id: string | null;
  user_id: string | null;
  cash_box_id: string;
  amount: number | string;
  status: string | null;
  transaction_date: string | null;
  receipt_number: string | null;
  cash_box_sequence: number | null;
  tx_sequence_in_box: number | null;
  cash_box_id_prefix_snapshot: string | null;
  cash_box_currency_snapshot: string | null;
  contact_name: string | null;
  contact_address: string | null;
  description: string | null;
  notes: string | null;
  line_items: unknown;
  sender_company_name_snapshot: string | null;
  sender_address_snapshot: string | null;
};

const TX_COLUMNS = [
  "id", "org_id", "user_id", "cash_box_id", "amount", "status", "transaction_date", "receipt_number",
  "cash_box_sequence", "tx_sequence_in_box", "cash_box_id_prefix_snapshot", "cash_box_currency_snapshot",
  "contact_name", "contact_address", "description", "notes", "line_items",
  "sender_company_name_snapshot", "sender_address_snapshot",
].join(", ");

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_ADDRESS = "SpendNote <receipt@spendnote.app>";
const TRIAL_DAYS = 14;
const RATE_LIMITS = {
  perUserHour: { limit: 30, windowSeconds: 3600 },
  perUserDay: { limit: 100, windowSeconds: 86400 },
  perRecipient: { limit: 3, windowSeconds: 600 },
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

const fail = (status: number, error: string, detail: string, extra: Record<string, unknown> = {}) =>
  json(status, { error, detail, ...extra });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail(405, "METHOD_NOT_ALLOWED", "Use POST.");
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !resendApiKey) {
      console.error("send-receipt-email: missing environment configuration");
      return fail(500, "SERVER_MISCONFIGURED", "Email sending is not configured.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!/^Bearer\s+\S+/i.test(authHeader)) {
      return fail(401, "NOT_AUTHENTICATED", "Please log in again.");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return fail(401, "NOT_AUTHENTICATED", "Please log in again.");
    }

    let body: ReceiptEmailBody;
    try {
      body = (await req.json()) as ReceiptEmailBody;
    } catch (_) {
      return fail(400, "INVALID_BODY", "Invalid request.");
    }

    const transactionId = String(body?.transactionId || "").trim();
    const to = String(body?.to || "").trim().toLowerCase();
    if (!UUID_RE.test(transactionId)) {
      return fail(400, "INVALID_TRANSACTION", "Missing transaction.");
    }
    if (!isValidRecipient(to)) {
      return fail(400, "INVALID_RECIPIENT", "Please enter a valid email address.");
    }

    // Read through the caller's own RLS: no row means no access.
    const { data: tx, error: txError } = await userClient
      .from("transactions")
      .select(TX_COLUMNS)
      .eq("id", transactionId)
      .maybeSingle<TxRow>();
    if (txError) {
      console.error("send-receipt-email: transaction lookup failed", txError);
      return fail(500, "TRANSACTION_LOOKUP_FAILED", "Could not load the transaction.");
    }
    if (!tx) {
      return fail(404, "TRANSACTION_NOT_FOUND", "Transaction not found.");
    }

    const { data: cashBox } = await userClient
      .from("cash_boxes")
      .select("user_id, sequence_number, id_prefix, currency")
      .eq("id", tx.cash_box_id)
      .maybeSingle();

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Same rule as spendnote_create_transaction (069): the plan of the
    // billing owner (org owner, else cash box owner) decides.
    let orgOwnerId: string | null = null;
    if (tx.org_id) {
      const { data: org } = await admin.from("orgs").select("owner_user_id").eq("id", tx.org_id).maybeSingle();
      orgOwnerId = org?.owner_user_id || null;
    }
    const billingOwnerId: string = orgOwnerId || cashBox?.user_id || tx.user_id || user.id;

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", billingOwnerId)
      .maybeSingle();
    const ownerTier = String(ownerProfile?.subscription_tier || "").trim().toLowerCase() || "preview";

    if (ownerTier === "free") {
      const { data: ownerAuth } = await admin.auth.admin.getUserById(billingOwnerId);
      const createdAt = ownerAuth?.user?.created_at ? Date.parse(ownerAuth.user.created_at) : NaN;
      if (Number.isFinite(createdAt) && Date.now() - createdAt > TRIAL_DAYS * 86400 * 1000) {
        return fail(403, "FREE_TRIAL_EXPIRED", "Your free trial has ended. Upgrade to Pro to email receipts.");
      }
    } else if (ownerTier !== "pro" && ownerTier !== "preview") {
      return fail(403, "PRO_REQUIRED", "Emailing receipts is available on the Pro plan.");
    }

    const consume = async (key: string, limit: number, windowSeconds: number) => {
      const res = await admin.rpc("spendnote_consume_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (res.error) {
        console.error("send-receipt-email: rate-limit RPC error", res.error);
        return { allowed: false, retryAfter: 60 };
      }
      const row = Array.isArray(res.data) ? res.data[0] : res.data;
      return { allowed: Boolean(row?.allowed), retryAfter: Math.max(Number(row?.retry_after_seconds) || 0, 1) };
    };

    const buckets = [
      { key: `receipt-email:user-hour:${user.id}`, ...RATE_LIMITS.perUserHour },
      { key: `receipt-email:user-day:${user.id}`, ...RATE_LIMITS.perUserDay },
      { key: `receipt-email:recipient:${user.id}:${to}`, ...RATE_LIMITS.perRecipient },
    ];
    for (const b of buckets) {
      const r = await consume(b.key, b.limit, b.windowSeconds);
      if (!r.allowed) {
        return fail(429, "RATE_LIMITED", "Too many receipt emails. Please try again later.", {
          retry_after_seconds: r.retryAfter,
        });
      }
    }

    const currency = String(tx.cash_box_currency_snapshot || cashBox?.currency || "USD").trim().toUpperCase() || "USD";
    const { receiptId, cashBoxCode } = buildReceiptIds({
      cashBoxSequence: cashBox?.sequence_number || tx.cash_box_sequence,
      txSequenceInBox: tx.tx_sequence_in_box,
      snapshotPrefix: tx.cash_box_id_prefix_snapshot,
      livePrefix: cashBox?.id_prefix,
      receiptNumber: tx.receipt_number,
    });

    const rendered = renderReceiptEmail({
      receiptId,
      cashBoxCode,
      dateStr: formatReceiptDate(tx.transaction_date),
      companyName: cleanText(tx.sender_company_name_snapshot, 200) || cleanText(body?.companyNameFallback, 200) || "—",
      companyAddress: cleanText(tx.sender_address_snapshot, 500) || cleanText(body?.companyAddressFallback, 500),
      contactName: cleanText(tx.contact_name, 200) || "—",
      contactAddress: cleanText(tx.contact_address, 500),
      items: buildLineItems(tx.line_items, tx.description, tx.amount, currency),
      total: formatMoney(tx.amount, currency),
      notes: cleanText(tx.notes, 2000),
      isVoided: String(tx.status || "").toLowerCase() === "voided",
      pdfUrl: normalizePdfUrl(body?.pdfUrl) || "",
    });

    const replyTo = String(user.email || "").trim();
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        reply_to: replyTo || undefined,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: { "X-Entity-Ref-ID": tx.id },
      }),
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text();
      console.error("send-receipt-email: Resend error", resendResp.status, detail);
      return fail(502, "SEND_FAILED", "The email could not be sent. Please try again.");
    }

    const resendData = await resendResp.json().catch(() => ({}));
    return json(200, { success: true, id: resendData?.id || null });
  } catch (e) {
    console.error("send-receipt-email: unexpected error", e);
    return fail(500, "UNEXPECTED_ERROR", "Something went wrong. Please try again.");
  }
});
