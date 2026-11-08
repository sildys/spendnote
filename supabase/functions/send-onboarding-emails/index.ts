import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  renderOnboardingNudgeDay1Template,
  renderOnboardingNudgeDay3Template,
  renderTrialExpiryWarningTemplate,
} from "../_shared/email-templates.ts";

type Body = {
  mode?: "run" | "dry_run" | "test";
  to?: string;
};

type Candidate = {
  user_id: string;
  email: string;
  full_name: string;
  signup_at: string;
  tx_count: number;
  sent: Record<string, string> | null;
};

type EmailType = "nudge_day1" | "nudge_day3" | "trial_ending";

const REPLY_TO = "support@spendnote.app";
const FROM = `Sild from SpendNote <${REPLY_TO}>`;
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

// At most one email per user per run; the trial warning wins over the nudges.
const pickEmail = (c: Candidate, now: number): EmailType | null => {
  const ageDays = (now - new Date(c.signup_at).getTime()) / DAY_MS;
  const daysLeft = TRIAL_DAYS - ageDays;
  const sent = c.sent || {};
  const tx = Number(c.tx_count || 0);

  if (daysLeft > 0 && daysLeft <= 3 && !sent.trial_ending) return "trial_ending";
  if (tx > 0) return null;

  if (ageDays >= 3 && ageDays < 7 && !sent.nudge_day3) {
    const day1At = sent.nudge_day1 ? new Date(sent.nudge_day1).getTime() : 0;
    if (!day1At || now - day1At >= 2 * DAY_MS) return "nudge_day3";
    return null;
  }
  if (ageDays >= 1 && ageDays < 3 && !sent.nudge_day1 && !sent.nudge_day3) return "nudge_day1";
  return null;
};

const render = (type: EmailType, c: Pick<Candidate, "full_name" | "signup_at" | "tx_count">, now: number) => {
  const ageDays = (now - new Date(c.signup_at).getTime()) / DAY_MS;
  const daysLeft = Math.max(1, Math.ceil(TRIAL_DAYS - ageDays));
  if (type === "nudge_day1") return renderOnboardingNudgeDay1Template({ fullName: c.full_name });
  if (type === "nudge_day3") return renderOnboardingNudgeDay3Template({ fullName: c.full_name, daysLeft });
  return renderTrialExpiryWarningTemplate({
    fullName: c.full_name,
    daysLeft,
    pricingUrl: "https://spendnote.app/spendnote-pricing",
    txCount: Number(c.tx_count || 0),
  });
};

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) return json(500, { error: "Missing required secrets" });

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Callers: the daily pg_cron job (secret kept in Vault) or an admin with a service-role-level key.
    let authorized = false;
    const cronSecret = (req.headers.get("x-cron-secret") || "").trim();
    if (cronSecret) {
      const { data } = await db.rpc("spendnote_verify_cron_secret", { p_secret: cronSecret });
      authorized = data === true;
    }
    if (!authorized) {
      const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
      if (bearer && bearer === serviceRoleKey) {
        authorized = true;
      } else if (bearer) {
        const probe = await createClient(supabaseUrl, bearer).auth.admin.listUsers({ page: 1, perPage: 1 });
        authorized = !probe.error;
      }
    }
    if (!authorized) return json(403, { error: "Forbidden" });

    const body = (await req.json().catch(() => ({}))) as Body;
    const mode = body.mode || "run";
    const now = Date.now();

    const sendOne = async (to: string, type: EmailType, rendered: { subject: string; html: string; text: string }, key: string) => {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: rendered.subject, html: rendered.html, text: rendered.text, tags: [{ name: "type", value: type }] }),
      });
      if (!resp.ok) throw new Error(`Resend failed: ${await resp.text()}`);
      return await resp.json();
    };

    if (mode === "test") {
      const to = String(body.to || "").trim().toLowerCase();
      if (!to.includes("@")) return json(400, { error: "Missing test address" });
      const sample = { full_name: "", signup_at: new Date(now - 4 * DAY_MS).toISOString(), tx_count: 0 };
      const types: EmailType[] = ["nudge_day1", "nudge_day3", "trial_ending"];
      for (const type of types) {
        const t = type === "trial_ending" ? { ...sample, signup_at: new Date(now - 11.5 * DAY_MS).toISOString() } : sample;
        await sendOne(to, type, render(type, t, now), `onb-test-${type}-${to}-${now}`);
      }
      return json(200, { success: true, mode, to, sent: types });
    }

    const { data, error } = await db.rpc("spendnote_onboarding_candidates");
    if (error) throw error;
    const candidates = (data || []) as Candidate[];

    const plan = candidates
      .map((c) => ({ c, type: pickEmail(c, now) }))
      .filter((p): p is { c: Candidate; type: EmailType } => p.type !== null);

    const counts = plan.reduce<Record<string, number>>((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});

    if (mode === "dry_run") return json(200, { success: true, mode, candidates: candidates.length, planned: counts });
    if (mode !== "run") return json(400, { error: "Unknown mode" });

    let sent = 0;
    const failures: string[] = [];
    for (const { c, type } of plan) {
      // Claim first: the unique (user_id, email_type) row stops a parallel run from sending twice.
      const { error: claimErr } = await db.from("email_log").insert({ user_id: c.user_id, email_type: type });
      if (claimErr) continue;
      try {
        await sendOne(c.email, type, render(type, c, now), `onb-${type}-${c.user_id}`);
        sent++;
      } catch (e) {
        await db.from("email_log").delete().eq("user_id", c.user_id).eq("email_type", type);
        failures.push(`${type}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return json(200, { success: true, mode, candidates: candidates.length, planned: counts, sent, failures });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
