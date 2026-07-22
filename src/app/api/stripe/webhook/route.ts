import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("WEBHOOK_ERROR:", msg);
    return new NextResponse(`Webhook Error: ${msg}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = session.subscription as string;

    if (!session?.metadata?.userId) {
      console.error("WEBHOOK_ERROR: No userId in session metadata");
      return new NextResponse("Webhook Error: No userId", { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

    await prisma.user.update({
      where: { id: session.metadata.userId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        stripePriceId: subscription.items?.data?.[0]?.price?.id ?? null,
        stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        stripePriceId: null,
        stripeSubscriptionId: null,
        stripeCurrentPeriodEnd: null,
      },
    });
  }

  return new NextResponse(null, { status: 200 });
}
