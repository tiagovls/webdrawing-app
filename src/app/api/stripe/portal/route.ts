import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!dbUser || !dbUser.stripeCustomerId) {
      return new NextResponse("No active subscription found", { status: 400 });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") || host.match(/^\d+\.\d+\.\d+\.\d+/) ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${baseUrl}/`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("STRIPE_PORTAL_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
