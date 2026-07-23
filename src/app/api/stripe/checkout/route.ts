import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - Not logged in" }, { status: 401 });
    }

    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "User data missing from Clerk" }, { status: 500 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId || priceId === "undefined") {
      return NextResponse.json({ error: "Price ID is missing. Please check NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID and NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID in Vercel environment variables." }, { status: 400 });
    }

    const email: string = user.emailAddresses?.[0]?.emailAddress || "";
    const name: string | null = `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;

    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name },
    });

    const host = req.headers.get("host") || "webdrawing.fr";
    const protocol = host.startsWith("localhost") || host.match(/^\d+\.\d+\.\d+\.\d+/) ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    let customerId = dbUser.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: { userId },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/#pricing`,
      metadata: { userId },
    };

    if (!dbUser.hasUsedTrial) {
      sessionConfig.subscription_data = { trial_period_days: 30 };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal Error";
    console.error("STRIPE_CHECKOUT_ERROR:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
