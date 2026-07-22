import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { verifyToken } from "@clerk/backend";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    let { userId } = auth();
    
    // Fallback manuel si Clerk auth() échoue (ex: test sur IP locale)
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const verified = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
          });
          userId = verified.sub;
          console.log("Token manuellement vérifié. userId:", userId);
        } catch (e) {
          console.error("Échec de la vérification manuelle du token:", e);
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - Not logged in" }, { status: 401 });
    }

    let user;
    try {
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
        }
      });
      if (clerkRes.ok) {
        user = await clerkRes.json();
      } else {
        console.error("Clerk REST API Error:", await clerkRes.text());
      }
    } catch (err) {
      console.error("Failed to fetch user from Clerk API:", err);
    }

    if (!user) {
      console.error("Critical Error: user not found for valid userId:", userId);
      return NextResponse.json({ error: "User data missing from Clerk" }, { status: 500 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    const email = user.email_addresses?.[0]?.email_address || "";
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || null;

    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: email,
        name: name,
      }
    });

    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') || host.match(/^\d+\.\d+\.\d+\.\d+/) ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    let customerId = dbUser.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        name: name || undefined,
        metadata: {
          userId: userId,
        },
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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/#pricing`,
      metadata: {
        userId,
      },
    };

    if (!dbUser.hasUsedTrial) {
      sessionConfig.subscription_data = {
        trial_period_days: 30,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("STRIPE_CHECKOUT_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
