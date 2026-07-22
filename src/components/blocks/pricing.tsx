"use client";

import { Check, Shield, Crown, Sparkles, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { getUserPlan } from "@/app/actions";

export function Pricing() {
  const features = [
    "Unlimited projects & 3D models",
    "Professional measurement tools",
    "Spatial annotations & live chat",
    "Secure sharing links",
    "BOM / hierarchy explorer",
    "Priority 24/7 customer support",
  ];

  const testimonials = [
    {
      name: "Antoine D.",
      role: "Freelance Mechanical Engineer",
      initial: "A",
      stars: 5,
      text: "I've tried many tools to share my designs, but WebDrawing stands out for its smoothness and simplicity. My clients love it."
    },
    {
      name: "Marie L.",
      role: "Product Designer",
      initial: "M",
      stars: 4,
      text: "Really handy for validating volumes with clients. Maybe missing a folder system to organise projects, but otherwise it's great!"
    },
    {
      name: "Thomas M.",
      role: "CAD Draughtsman",
      initial: "T",
      stars: 5,
      text: "No more 10 screenshots and long emails. I send the link and the client rotates the part themselves — a real time saver."
    },
    {
      name: "Julie R.",
      role: "Industrial Design Agency",
      initial: "J",
      stars: 5,
      text: "The built-in measurement tool is strikingly precise. Our back-and-forth with suppliers has been cut in half."
    }
  ];

  const [tIndex, setTIndex] = useState(0);
  const [isAnnual, setIsAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isSignedIn, getToken, isLoaded, userId } = useAuth();
  const [plan, setPlan] = useState<"Free" | "Pro" | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      if (isLoaded && userId) {
        const data = await getUserPlan(userId);
        setPlan(data.plan as "Free" | "Pro");
      }
    }
    fetchPlan();
  }, [isLoaded, userId]);

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to connect to Stripe portal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    try {
      setIsLoading(true);
      const token = await getToken();

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          priceId: isAnnual
            ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
            : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
        }),
      });

      if (res.status === 401) {
        alert("Error: The server could not identify you. Try reloading the page or signing in again.");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Server error while creating the payment session.");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Erreur Checkout", error);
      alert("Connection error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setIsAnnual(checked);
    if (checked) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#3b82f6", "#f59e0b"]
      });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container mx-auto py-2 px-4 sm:px-6">
      {plan !== "Pro" && (
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
            <span className={cn("text-sm font-medium transition-colors", !isAnnual ? "text-dark-900" : "text-dark-400")}>
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={handleToggle} />
            <div className="flex items-center gap-1.5">
              <span className={cn("text-sm font-medium transition-colors", isAnnual ? "text-dark-900" : "text-dark-400")}>
                Annual
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-brand-200 bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-wider">
                -17%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-3xl mx-auto bg-white rounded-2xl border border-surface-200 shadow-lg overflow-hidden flex flex-col md:flex-row">

        {/* Coupon Badge */}
        <AnimatePresence>
          {isAnnual && plan !== "Pro" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
              className="absolute top-0 right-0 bg-brand-500 text-white text-[11px] font-bold uppercase tracking-wider py-1.5 px-4 rounded-bl-xl z-10 shadow-md"
            >
              Popular - Yearly
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Column */}
        <div className="p-5 md:p-6 md:w-[45%] flex flex-col justify-between border-b md:border-b-0 md:border-r border-surface-200 bg-surface-50/50">
          {plan === "Pro" ? (
            <div className="flex flex-col h-full justify-center text-center items-center py-8">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-5">
                <Crown className="w-8 h-8 text-brand-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-dark-900 mb-3 leading-tight">
                Active Pro Subscription
              </h2>
              <p className="text-dark-500 text-sm mb-8 px-2">
                You have access to all advanced WebDrawing features. Thank you for your support!
              </p>

              <button
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="w-full bg-dark-900 hover:bg-dark-800 disabled:opacity-50 text-white font-semibold py-3.5 px-5 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 text-sm"
              >
                <span>{isLoading ? "Loading..." : "Manage my subscription"}</span>
                {!isLoading && <ExternalLink className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <>
              <div>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md border border-surface-200 bg-white text-[10px] font-semibold text-dark-700 shadow-sm uppercase tracking-wider">
                  <Crown className="w-3 h-3 text-brand-500" />
                  Pro Unlimited
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-dark-900 mt-3 leading-tight">
                  The complete tool for engineers
                </h2>
                <p className="text-dark-500 mt-1.5 text-sm">
                  Collaborate without friction on your CAD designs with an all-in-one licence.
                </p>

                <div className="flex flex-col mt-4">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl md:text-4xl font-extrabold text-dark-900 tracking-tight flex items-baseline">
                      <NumberFlow value={isAnnual ? 29 : 35} />
                      <span>€</span>
                    </div>
                    <span className="text-dark-500 font-medium">/mo</span>
                    <span className="text-dark-400 line-through decoration-dark-300 font-medium ml-1">
                      {isAnnual ? "35€" : "49€"}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-col gap-1 bg-gradient-to-r from-[#bbf7d0] to-[#86efac] rounded-xl p-4 border border-green-300 shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isAnnual ? "annual" : "monthly"}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="text-dark-700 font-bold text-sm tracking-tight"
                      >
                        {isAnnual ? "Billed annually (-17%)" : "Launch price (limited time)"}
                      </motion.div>
                    </AnimatePresence>
                    <span className="text-dark-900 text-lg font-black flex items-center gap-2">
                      <span className="text-xl leading-none origin-bottom animate-bounce">🎁</span>
                      1 month free trial
                    </span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2">
                  <li className="flex items-center gap-2.5 text-dark-700 text-sm font-medium">
                    <Check className="w-4 h-4 text-dark-900 flex-shrink-0" />
                    No commitment, cancel anytime
                  </li>
                  <li className="flex items-center gap-2.5 text-dark-700 text-sm font-medium">
                    <Shield className="w-4 h-4 text-dark-900 flex-shrink-0" />
                    30-day money-back guarantee
                  </li>
                  <li className="flex items-center gap-2.5 text-dark-700 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-dark-900 flex-shrink-0" />
                    Built by engineers, for engineers
                  </li>
                </ul>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full bg-dark-900 hover:bg-dark-800 disabled:opacity-50 text-white font-semibold py-3 px-5 rounded-lg transition-all shadow flex items-center justify-between group text-sm"
                >
                  <span>{isLoading ? "Loading..." : "Start free trial"}</span>
                  {!isLoading && <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                </button>
                <Link
                  href="#features"
                  className="w-full bg-white hover:bg-surface-50 text-dark-900 font-semibold py-3 px-5 rounded-lg border border-surface-200 transition-all shadow-sm flex items-center justify-between group text-sm"
                >
                  <span>View features</span>
                  <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-dark-900 transition-colors" />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="p-5 md:p-6 md:w-[55%] flex flex-col justify-between bg-white">
          <div>
            <h3 className="text-sm font-bold text-dark-900 mb-3.5">Included Features</h3>
            <ul className="space-y-1.5">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded-full bg-surface-100 p-0.5 flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-dark-700 stroke-[3]" />
                  </div>
                  <span className="text-dark-700 text-sm leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial */}
          <div className="mt-4 pt-4 border-t border-surface-100 relative min-h-[150px]">
            <div className="flex items-center justify-center gap-1.5 mb-2.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === tIndex ? "bg-dark-900" : "bg-surface-200 hover:bg-surface-300"}`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={tIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-surface-50/50 border border-surface-200 rounded-xl p-3.5 absolute inset-x-0 top-7"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600 text-sm">
                      {testimonials[tIndex].initial}
                    </div>
                    <div>
                      <p className="font-bold text-dark-900 text-xs">{testimonials[tIndex].name}</p>
                      <p className="text-dark-500 text-[10px]">{testimonials[tIndex].role}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className={`w-3 h-3 ${i < testimonials[tIndex].stars ? "fill-dark-900 text-dark-900" : "fill-surface-200 text-surface-200"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-dark-700 text-xs italic leading-relaxed">
                  "{testimonials[tIndex].text}"
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
