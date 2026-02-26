import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const resolveTierFromPrice = (priceId: string): "standard" | "pro" | "" => {
  const raw = String(priceId || "").trim();
  const standardMonthly = Deno.env.get("STRIPE_STANDARD_MONTHLY_PRICE_ID") || "";
  const standardYearly = Deno.env.get("STRIPE_STANDARD_YEARLY_PRICE_ID") || "";
  const proMonthly = Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID") || "";
  const proYearly = Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID") || "";

  if (!raw) return "";
  if (raw === standardMonthly || raw === standardYearly) return "standard";
  if (raw === proMonthly || raw === proYearly) return "pro";
  return "";
};

const resolveCycleFromPrice = (priceId: string): "monthly" | "yearly" | "" => {
  const raw = String(priceId || "").trim();
  const standardMonthly = Deno.env.get("STRIPE_STANDARD_MONTHLY_PRICE_ID") || "";
  const standardYearly = Deno.env.get("STRIPE_STANDARD_YEARLY_PRICE_ID") || "";
  const proMonthly = Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID") || "";
  const proYearly = Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID") || "";

  if (!raw) return "";
  if (raw === standardMonthly || raw === proMonthly) return "monthly";
  if (raw === standardYearly || raw === proYearly) return "yearly";
  return "";
};

const billingStatusFromStripe = (status: string): string => {
  const raw = String(status || "").trim().toLowerCase();
  const allowed = new Set([
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "paused",
  ]);
  return allowed.has(raw) ? raw : "active";
};

const findUserIdFromSubscription = async (supabaseAdmin: ReturnType<typeof createClient>, sub: Stripe.Subscription) => {
  const metadataUserId = String(sub.metadata?.user_id || "").trim();
  if (metadataUserId) return metadataUserId;

  const customerId = String(sub.customer || "").trim();
  if (!customerId) return "";

  const { data: profileByCustomer } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return String(profileByCustomer?.id || "").trim();
};

const upsertProfileSubscription = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  sub: Stripe.Subscription,
) => {
  const stripePriceId = String(sub.items?.data?.[0]?.price?.id || "").trim();
  const tier = resolveTierFromPrice(stripePriceId);
  const billingCycle = resolveCycleFromPrice(stripePriceId);

  const payload: Record<string, unknown> = {
    stripe_customer_id: String(sub.customer || "").trim() || null,
    stripe_subscription_id: String(sub.id || "").trim() || null,
    stripe_price_id: stripePriceId || null,
    billing_status: billingStatusFromStripe(String(sub.status || "")),
    billing_cycle: billingCycle || null,
    stripe_cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    subscription_current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  };

  if (tier) {
    payload.subscription_tier = tier;
  }

  await supabaseAdmin
    .from("profiles")
    .update(payload)
    .eq("id", userId);
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stripeSecretKey || !stripeWebhookSecret) {
      return new Response(JSON.stringify({ error: "Missing Stripe webhook secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSignature = req.headers.get("stripe-signature") || "";
    if (!stripeSignature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, stripeSignature, stripeWebhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid webhook signature";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = String(session.metadata?.user_id || "").trim();
        const customerId = String(session.customer || "").trim();
        const subscriptionId = String(session.subscription || "").trim();

        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_customer_id: customerId || null,
              stripe_subscription_id: subscriptionId || null,
              billing_status: "active",
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserIdFromSubscription(supabaseAdmin, sub);
        if (userId) {
          await upsertProfileSubscription(supabaseAdmin, userId, sub);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserIdFromSubscription(supabaseAdmin, sub);
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_tier: "free",
              billing_status: "canceled",
              stripe_subscription_id: null,
              stripe_price_id: null,
              stripe_cancel_at_period_end: false,
              billing_cycle: null,
            })
            .eq("id", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer || "").trim();
        if (customerId) {
          await supabaseAdmin
            .from("profiles")
            .update({ billing_status: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer || "").trim();
        if (customerId) {
          await supabaseAdmin
            .from("profiles")
            .update({ billing_status: "active" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
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
