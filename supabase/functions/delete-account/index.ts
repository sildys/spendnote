import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify the caller's JWT
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

    const userId = user.id;

    // Service-role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check if user is an owner of any org
    const { data: ownedOrgs, error: orgError } = await supabaseAdmin
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", userId)
      .eq("role", "owner");

    if (orgError) {
      return new Response(JSON.stringify({ error: "Failed to check org memberships: " + orgError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If user is owner of any org(s), delete those orgs first
    // This cascades to org_memberships, removing all team members' access
    if (ownedOrgs && ownedOrgs.length > 0) {
      const orgIds = ownedOrgs.map((m: { org_id: string }) => m.org_id);

      const { error: deleteOrgsError } = await supabaseAdmin
        .from("orgs")
        .delete()
        .in("id", orgIds);

      if (deleteOrgsError) {
        return new Response(JSON.stringify({ error: "Failed to delete organization(s): " + deleteOrgsError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Best-effort cleanup for legacy/direct references that can block auth deletion.
    // 1) Null-out audit actor refs (safe even if FK already SET NULL).
    try {
      await supabaseAdmin
        .from("audit_log")
        .update({ actor_id: null })
        .eq("actor_id", userId);
    } catch (_) {
      // ignore
    }

    // 2) Delete storage objects owned by this user (if storage schema/column is present).
    // Some projects can have restrictive FKs around storage ownership.
    try {
      const q1 = await supabaseAdmin
        .schema("storage")
        .from("objects")
        .delete()
        .eq("owner", userId);

      if (q1.error && String(q1.error.message || "").toLowerCase().includes("owner_id")) {
        await supabaseAdmin
          .schema("storage")
          .from("objects")
          .delete()
          .eq("owner_id", userId);
      }
    } catch (_) {
      // ignore
    }

    // 3) Explicitly delete profile first so profile-rooted cascades are executed
    // before deleting auth.users (helps avoid legacy FK blockers).
    try {
      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileDeleteError) {
        return new Response(JSON.stringify({ error: "Failed to delete profile: " + profileDeleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (profileErr) {
      const msg = profileErr instanceof Error ? profileErr.message : "Unknown profile deletion error";
      return new Response(JSON.stringify({ error: "Failed to delete profile: " + msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete the auth user.
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return new Response(JSON.stringify({
        error: "Failed to delete user: " + deleteUserError.message,
        code: (deleteUserError as { code?: string }).code || null,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
