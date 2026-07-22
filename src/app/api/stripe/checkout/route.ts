import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - Not logged in" }, { status: 401 });
    }

    // Fetch user from Clerk REST API
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });

    if (!clerkRes.ok) {
      console.error("Clerk REST API Error:", await clerkRes.text());
      return NextResponse.json({ error: "User data missing from Clerk" }, { status: 500 });
    }

    const user = await clerkRes.json();

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    const email: string = user.email_addresses?.[0]?.email_address || "";
    const name: string | null = `${user.first_name || ""} ${user.last_name || ""}`.trim() || null;

    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name },
    });

    const host = req.headers.get("host") || "localhost:3000";
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
  } catch (error) {
    console.error("STRIPE_CHECKOUT_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
