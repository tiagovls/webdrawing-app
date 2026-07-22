const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    console.log("Adding Stripe columns to User table via HTTP...");
    
    await sql`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT,
      ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT,
      ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT,
      ADD COLUMN IF NOT EXISTS "stripe_current_period_end" TIMESTAMP(3);
    `;

    console.log("Adding unique constraints (errors are ignored if already exist)...");
    
    try {
      await sql`CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");`;
    } catch(e) { console.log(e.message) }

    try {
      await sql`CREATE UNIQUE INDEX "User_stripe_subscription_id_key" ON "User"("stripe_subscription_id");`;
    } catch(e) { console.log(e.message) }

    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
