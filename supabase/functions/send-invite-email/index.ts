import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses@3";

type InviteEmailBody = {
  invitedEmail: string;
  inviteLink: string;
  role?: string;
  inviteToken?: string;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const awsRegion = Deno.env.get("AWS_REGION") || "";
    const awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") || "";
    const awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_SERVICE_ROLE_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missingAws: string[] = [];
    if (!awsRegion) missingAws.push("AWS_REGION");
    if (!awsAccessKeyId) missingAws.push("AWS_ACCESS_KEY_ID");
    if (!awsSecretAccessKey) missingAws.push("AWS_SECRET_ACCESS_KEY");

    if (missingAws.length) {
      return new Response(JSON.stringify({
        error: `Missing AWS SES secrets: ${missingAws.join(", ")}`,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as InviteEmailBody;
    const invitedEmail = String(body?.invitedEmail || "").trim().toLowerCase();
    const inviteLink = String(body?.inviteLink || "").trim();
    const inviteToken = String(body?.inviteToken || "").trim();
    const role = String(body?.role || "user").trim().toLowerCase();

    if (!invitedEmail || !inviteLink || !inviteToken) {
      return new Response(JSON.stringify({ error: "Missing invitedEmail / inviteLink / inviteToken" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: inviteRow, error: inviteError } = await supabaseAdmin
      .from("invites")
      .select("id, org_id, invited_email, role, status")
      .eq("token", inviteToken)
      .single();

    if (inviteError || !inviteRow) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(inviteRow.status || "").toLowerCase() !== "pending") {
      return new Response(JSON.stringify({ error: "Invite is not pending" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(inviteRow.invited_email || "").toLowerCase() !== invitedEmail) {
      return new Response(JSON.stringify({ error: "Invite email mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = String(inviteRow.org_id || "").trim();
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Invite missing org_id" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("org_memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    const callerRole = String(membership?.role || "").toLowerCase();
    const isAdmin = callerRole === "owner" || callerRole === "admin";

    if (membershipError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = Deno.env.get("SPENDNOTE_EMAIL_FROM") || "no-reply@spendnote.app";
    const appUrl = Deno.env.get("SPENDNOTE_APP_URL") || "";
    const subject = Deno.env.get("SPENDNOTE_INVITE_SUBJECT") || "You have been invited to SpendNote";

    const fromEmail = (() => {
      const raw = String(from || "").trim();
      const m = /<([^>]+)>/.exec(raw);
      return String((m && m[1]) ? m[1] : raw).trim();
    })();

    const safeRole = role === "admin" ? "Admin" : "User";
    const effectiveLink = appUrl ? inviteLink.replace(/^https?:\/\/[^/]+/i, appUrl) : inviteLink;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;">
        <h2 style="margin:0 0 12px;">You’ve been invited to SpendNote</h2>
        <p style="margin:0 0 12px;">You were invited as <strong>${safeRole}</strong>.</p>
        <p style="margin:0 0 16px;">Click this link to accept:</p>
        <p style="margin:0 0 16px;"><a href="${effectiveLink}">${effectiveLink}</a></p>
        <p style="margin:0;color:#6b7280;">If you didn’t expect this invite, you can ignore this email.</p>
      </div>
    `;

    const ses = new SESClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    try {
      const result = await ses.send(new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [invitedEmail] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
          },
        },
      }));

      return new Response(JSON.stringify({ success: true, data: result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (sendError) {
      const detail = sendError instanceof Error ? sendError.message : String(sendError);
      return new Response(JSON.stringify({
        error: "Failed to send",
        detail,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
