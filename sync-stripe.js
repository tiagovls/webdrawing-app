require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const Stripe = require("stripe");

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  console.log("Fetching users from DB...");
  const users = await prisma.user.findMany({
    where: {
      stripeCustomerId: { not: null }
    }
  });

  console.log(`Found ${users.length} users with Stripe Customer IDs.`);

  for (const user of users) {
    try {
      console.log(`Checking subscriptions for customer ${user.stripeCustomerId}...`);
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        console.log(`Found active subscription ${sub.id} for user ${user.email}`);
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
          }
        });
        console.log(`✅ User ${user.email} upgraded to PRO in DB!`);
      } else {
        console.log(`No active subscriptions for ${user.email}`);
      }
    } catch (err) {
      console.error(`Error processing user ${user.email}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

run().catch(console.error);
