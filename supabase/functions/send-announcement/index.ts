import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderProductUpdateMobileTemplate } from "../_shared/email-templates.ts";

type Body = {
  mode: "test" | "dry_run" | "all";
  to?: string;
  confirm?: string;
};

const CAMPAIGN = "product-update-mobile-2026-10";
const REPLY_TO = "support@spendnote.app";
const BATCH_SIZE = 100;

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const from = Deno.env.get("SPENDNOTE_EMAIL_FROM") || "SpendNote <no-reply@spendnote.app>";

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) return json(500, { error: "Missing required secrets" });

    // Bulk mail to every user: only callable with a service-role-level key, never from the browser.
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return json(403, { error: "Forbidden" });
    if (bearer !== serviceRoleKey) {
      const probe = await createClient(supabaseUrl, bearer).auth.admin.listUsers({ page: 1, perPage: 1 });
      if (probe.error) return json(403, { error: "Forbidden" });
    }

    const body = (await req.json()) as Body;
    const db = createClient(supabaseUrl, serviceRoleKey);

    const sendBatch = async (items: Array<{ email: string; name: string }>, key: string) => {
      const payload = items.map((r) => {
        const t = renderProductUpdateMobileTemplate({ fullName: r.name });
        return { from, to: [r.email], reply_to: REPLY_TO, subject: t.subject, html: t.html, text: t.text };
      });
      const resp = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`Resend failed: ${await resp.text()}`);
      return await resp.json();
    };

    if (body.mode === "test") {
      const to = String(body.to || "").trim().toLowerCase();
      if (!to.includes("@")) return json(400, { error: "Missing test address" });
      const data = await sendBatch([{ email: to, name: "" }], `${CAMPAIGN}-test-${to}-${Date.now()}`);
      return json(200, { success: true, mode: "test", to, data });
    }

    // Confirmed, non-banned auth users only; unconfirmed addresses would hurt deliverability.
    const recipients = new Map<string, string>();
    for (let page = 1; ; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const users = data?.users || [];
      for (const u of users) {
        const email = String(u.email || "").trim().toLowerCase();
        const banned = u.banned_until && new Date(u.banned_until).getTime() > Date.now();
        if (!email || !u.email_confirmed_at || banned) continue;
        recipients.set(u.id, email);
      }
      if (users.length < 1000) break;
    }

    const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", [...recipients.keys()]);
    const names = new Map((profiles || []).map((p) => [String(p.id), String(p.full_name || "").trim()]));
    const list = [...new Map([...recipients].map(([id, email]) => [email, names.get(id) || ""])).entries()]
      .map(([email, name]) => ({ email, name }));

    if (body.mode === "dry_run") {
      return json(200, { success: true, mode: "dry_run", count: list.length, domains: [...new Set(list.map((r) => r.email.split("@")[1]))].length });
    }

    if (body.mode !== "all" || body.confirm !== "SEND_ALL") return json(400, { error: "Use mode=all with confirm=SEND_ALL" });

    let sent = 0;
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      await sendBatch(list.slice(i, i + BATCH_SIZE), `${CAMPAIGN}-batch-${i / BATCH_SIZE}`);
      sent += Math.min(BATCH_SIZE, list.length - i);
    }
    return json(200, { success: true, mode: "all", sent });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
