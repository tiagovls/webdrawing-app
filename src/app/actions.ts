"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"

export async function getUserPlan(clientUserId?: string) {
  try {
    const { userId: serverUserId } = await auth();
    const userId = serverUserId || clientUserId;
    
    if (!userId) {
      return { isPro: false, plan: "Free" }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCurrentPeriodEnd: true }
    })

    if (!user || !user.stripeCurrentPeriodEnd) {
      return { isPro: false, plan: "Free" }
    }

    // Check if the current period end is in the future
    if (user?.stripeCurrentPeriodEnd && user.stripeCurrentPeriodEnd.getTime() > Date.now()) {
      return { isPro: true, plan: "Pro" }
    }

    return { isPro: false, plan: "Free" }
  } catch (error) {
    console.error("getUserPlan error:", error);
    return { isPro: false, plan: "Free" }
  }
}

export async function createCheckoutSession(priceId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Vous devez être connecté");
    }

    const user = await currentUser();
    if (!user) {
      throw new Error("Données utilisateur introuvables");
    }

    if (!priceId) {
      throw new Error("L'identifiant du prix est requis");
    }

    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: user.emailAddresses[0].emailAddress,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
      }
    });

    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') || host.match(/^\d+\.\d+\.\d+\.\d+/) ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    let customerId = dbUser.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0].emailAddress,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/#pricing`,
      metadata: {
        userId: userId,
      },
    });

    return { url: session.url };
  } catch (error) {
    console.error("STRIPE_CHECKOUT_ERROR", error);
    throw new Error("Une erreur est survenue lors de la création de la session");
  }
}
