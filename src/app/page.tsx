'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import {
  Box,
  Share2,
  Ruler,
  MessageSquare,
  Shield,
  Eye,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Star,
  Quote,
  Lock,
} from 'lucide-react'
import { Pricing } from '@/components/blocks/pricing'
import { PlanBadge } from '@/components/blocks/plan-badge'
import { WorkflowVideo } from '@/components/blocks/workflow-video'
import { ClientUserButton } from '@/components/ClientUserButton'
import FAQAccordion from '@/components/ui/accordion-2'
import { MagicText } from '@/components/ui/magic-text'

const features = [
  {
    icon: Share2,
    title: 'Zero friction sharing',
    desc: <>Your clients open the link directly. <span className="bg-[#bbf7d0]/40 px-1.5 py-0.5 rounded-sm text-dark-900 box-decoration-clone font-medium">No installation, no account required.</span></>,
  },
  {
    icon: Ruler,
    title: 'Get accurate measurements directly',
    desc: <>Measure <span className="text-brand-600 font-semibold">distances, edges and diameters</span> directly in 3D, just like in SolidWorks.</>,
  },
  {
    icon: MessageSquare,
    title: 'Pinpoint feedback with spatial annotations',
    desc: <>Pin comments <span className="text-brand-600 font-semibold">directly on the 3D geometry</span>. Async collaboration made easy.</>,
  },
  {
    icon: Shield,
    title: 'Keep your IP secure',
    desc: <>Password protection, automatic expiry dates. Your source file <span className="text-brand-600 font-semibold">stays private</span>.</>,
  },
  {
    icon: Eye,
    title: 'Navigate full assemblies easily',
    desc: <>Navigate the model tree. <span className="text-brand-600 font-semibold">Show/hide each sub-component</span> independently.</>,
  },
  {
    icon: Share2,
    title: 'Share anywhere with one link',
    desc: <>Generate a unique URL in one click. Share via <span className="text-brand-600 font-semibold">email, Slack or Teams</span>.</>,
  },
]

const steps = [
  { num: '01', title: 'Upload your GLB', desc: <>Drag and drop your file from <span className="text-brand-600 font-semibold">Fusion 360, FreeCAD</span> or any other CAD software.</> },
  { num: '02', title: 'Configure sharing', desc: <>Optional: add a <span className="text-brand-600 font-semibold">password</span> and an <span className="text-brand-600 font-semibold">expiry date</span> in 30 seconds.</> },
  { num: '03', title: 'Send the link', desc: <>Your client opens the interactive 3D model <span className="bg-[#bbf7d0]/40 px-1.5 py-0.5 rounded-sm text-dark-900 box-decoration-clone font-medium">directly in their browser</span>.</> },
]

const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
)

export default function LandingPage() {
  const { isSignedIn } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen font-sans flex flex-col bg-surface-50 text-dark-900">

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav
        className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${scrolled
            ? 'top-4 w-[95%] max-w-7xl rounded-2xl bg-white/20 backdrop-blur-md shadow-lg border border-white/20 py-3'
            : 'top-0 w-full rounded-none bg-transparent py-5'
          }`}
      >
        <div className="max-w-7xl w-full mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center glow-brand-sm">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className={`font-semibold text-lg tracking-tight ${scrolled ? 'text-dark-900' : 'text-white'}`}>WebDrawing</span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            {!isSignedIn ? (
              <>
                <Link
                  href="/sign-in"
                  className={`text-sm font-medium transition-colors px-4 py-2 ${scrolled ? 'text-dark-700 hover:text-brand-600' : 'text-white/90 hover:text-white'}`}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                  Get started for free
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors px-4 py-2 ${scrolled ? 'text-dark-700 hover:text-brand-600' : 'text-white/90 hover:text-white'}`}
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-3">
                  <ClientUserButton />
                  <PlanBadge />
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className={`w-6 h-6 ${scrolled ? 'text-dark-900' : 'text-white'}`} />
            ) : (
              <Menu className={`w-6 h-6 ${scrolled ? 'text-dark-900' : 'text-white'}`} />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white/95 backdrop-blur-xl shadow-xl border border-surface-200 py-4 px-6 flex flex-col gap-4 md:hidden rounded-2xl">
            {!isSignedIn ? (
              <>
                <Link
                  href="/sign-in"
                  className="text-dark-900 font-medium py-2 hover:text-brand-600 text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 px-4 rounded-xl text-center shadow-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get started for free
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="text-dark-900 font-medium py-2 hover:text-brand-600 text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <div className="flex items-center justify-center gap-4 py-3 border-t border-surface-200 mt-2">
                  <PlanBadge />
                  <ClientUserButton />
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── Hero Section with Video Background ──────────────────────── */}
      <section className="relative flex items-center justify-center min-h-[90vh] pt-32 pb-24 overflow-hidden rounded-b-[3rem] shadow-2xl mb-12">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            src="/hero-bg.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Dark Overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto text-white">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white text-xs font-medium mb-8">
              <span className="flex gap-1 text-accent-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
              </span>
              Trusted by 500+ mechanical engineers
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 drop-shadow-lg">
              Get Client Approvals on 3D Models Faster,{' '}
              <span className="text-accent-500 block mt-2">Without Sending Heavy CAD Files</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow">
              Share, review, and annotate 3D assemblies directly in the browser via a single link. Zero installations, zero friction.
            </p>

            <div className="flex flex-col items-center justify-center gap-2 w-full px-4 sm:px-0">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {isSignedIn ? (
                  <Link
                    href="/dashboard"
                    className="group inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 text-lg"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="group inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 text-lg"
                  >
                    Start for free
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
              <p className="text-white/90 text-sm mt-1 flex flex-col sm:flex-row items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-accent-500" />
                No plugin required. Opens instantly on any device, even smartphones.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-surface-50">
        {/* ── Problem Agitation ─────────────────────────────────────────── */}
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left: Image (Moved from right) */}
            <FadeUp delay={0.3} className="relative mt-8 md:mt-0 md:order-1 order-2 hidden md:block md:col-span-5">
              <div className="relative rounded-2xl overflow-hidden z-10 aspect-[4/5] bg-surface-100 w-full max-w-[380px] mx-auto lg:ml-auto">
                <img 
                  src="/traumatized.jpg" 
                  alt="Frustrated engineer" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-dark-900/10 to-transparent mix-blend-overlay pointer-events-none" />
              </div>
              
              {/* Decorative background blob */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-red-100 to-amber-100 rounded-full blur-3xl opacity-70" />
            </FadeUp>

            {/* Right: Text (Moved from left) */}
            <div className="flex flex-col justify-center gap-6 md:order-2 order-1 md:col-span-7">
              <FadeUp>
                <h2 className="text-3xl sm:text-4xl font-bold text-dark-900 leading-tight">
                  <span className="bg-gradient-to-tr from-[#bbf7d0] to-[#86efac] px-3 py-0.5 rounded-lg text-dark-900 inline-block -rotate-2 shadow-sm ring-2 ring-[#bbf7d0]/50">Traumatized</span> by eDrawings and heavy CAD files?
                </h2>
              </FadeUp>
              
              <div className="flex flex-col gap-4 mt-2">
                <FadeUp delay={0.1}>
                  <p className="text-lg text-dark-600 leading-loose">
                    You've spent hours working on an assembly, only to send the file and get an angry call from your client:
                  </p>
                </FadeUp>
                <FadeUp delay={0.15}>
                  <p className="text-xl font-medium text-brand-600 italic py-2 border-l-4 border-brand-200 pl-4 bg-brand-50/50 rounded-r-lg">
                    "The page won't load." — "It's asking for a plugin." — "My computer is too old to run this."
                  </p>
                </FadeUp>
                <FadeUp delay={0.2}>
                  <p className="text-lg text-dark-600 leading-loose mt-2">
                    WebDrawing solves this by converting your CAD models into ultra-lightweight GLB formats. <span className="bg-[#bbf7d0]/40 px-1.5 py-0.5 rounded-sm font-medium text-dark-900 box-decoration-clone">Your clients can open massive assemblies in 2 seconds</span> flat on their smartphone <span className="bg-[#bbf7d0]/40 px-1.5 py-0.5 rounded-sm font-medium text-dark-900 box-decoration-clone">via a simple SMS or email link.</span>
                  </p>
                </FadeUp>
              </div>
            </div>

          </div>
        </section>
        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="how" className="py-24 px-6 w-full bg-white border-y border-surface-200 scroll-mt-24">
          <div className="max-w-5xl mx-auto">
            <FadeUp>
              <p className="text-center text-xs font-semibold tracking-widest text-brand-500 uppercase mb-3">
                Zero Friction Workflow
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-center text-dark-900 mb-16">
                Share your 3D models in <span className="bg-gradient-to-tr from-[#bbf7d0] to-[#86efac] px-3 py-0.5 rounded-lg text-dark-900 inline-block rotate-2 shadow-sm ring-2 ring-[#bbf7d0]/50">3 simple steps</span>
              </h2>
            </FadeUp>

            <FadeUp delay={0.2}>
              <WorkflowVideo />
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {steps.map((step, i) => (
                <FadeUp key={step.num} delay={i * 0.1}>
                  <div className="bg-surface-50 rounded-2xl p-6 h-full border border-surface-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="text-4xl font-black text-surface-200 group-hover:text-brand-200 transition-colors mb-4 font-mono">
                      {step.num}
                    </div>
                    <h3 className="font-semibold text-lg text-dark-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-dark-700 leading-relaxed">{step.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto mb-12 scroll-mt-24 border-t border-surface-200">
          <div className="max-w-3xl mb-16">
            <FadeUp>
              <h2 className="text-3xl sm:text-4xl font-bold text-dark-900 mb-4 tracking-tight">
                Everything you need to collaborate seamlessly
              </h2>
              <p className="text-lg text-dark-500">
                Advanced engineering tools packed into a blazing-fast web interface. No more heavy files to send.
              </p>
            </FadeUp>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            {features.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.07}>
                <div className="group relative bg-white p-6 rounded-2xl border border-surface-200 shadow-sm hover:shadow-md transition-all h-full">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-5 text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors shadow-sm">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-dark-900 mb-2">{f.title}</h3>
                  <p className="text-dark-600 leading-relaxed text-sm">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Testimonials (Social Proof) ───────────────────────────────── */}
        <section className="py-24 px-6 max-w-7xl mx-auto mb-12">
          <div className="bg-brand-50 rounded-[3rem] p-12 sm:p-20">
            <div className="text-center mb-16">
              <FadeUp>
                <h2 className="text-3xl sm:text-4xl font-bold text-dark-900 mb-4">
                  <span className="bg-gradient-to-tr from-[#bbf7d0] to-[#86efac] px-3 py-0.5 rounded-lg text-dark-900 inline-block -rotate-2 shadow-sm ring-2 ring-[#bbf7d0]/50">Loved</span> by mechanical designers
                </h2>
                <p className="text-lg text-dark-600">
                  See what other engineers are saying about WebDrawing.
                </p>
              </FadeUp>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                {
                  quote: <>Finally, a tool that just works. We used to spend hours trying to get our clients to install viewers. Now I just <span className="text-brand-600 font-semibold">send a link on Slack</span> and get feedback in minutes.</>,
                  name: "Alexandre D.",
                  role: "Independent Engineer",
                  image: "https://i.pravatar.cc/150?u=a042581f4e29026024d"
                },
                {
                  quote: <>The loading speed is insane. We upload 500MB assemblies and our clients open them on their iPhones <span className="bg-[#bbf7d0]/40 px-1.5 py-0.5 rounded-sm text-dark-900 box-decoration-clone font-medium">without any lag</span>. It completely changed our review process.</>,
                  name: "Sarah J.",
                  role: "Product Designer",
                  image: "https://i.pravatar.cc/150?u=a042581f4e29026704d"
                },
                {
                  quote: <>No more 'I can't open the file' emails from buyers. WebDrawing is the <span className="text-brand-600 font-semibold">best investment we made</span> this year for our sales engineering team.</>,
                  name: "Marc L.",
                  role: "Technical Sales",
                  image: "https://i.pravatar.cc/150?u=a04258114e29026702d"
                }
              ].map((testimonial, i) => (
                <FadeUp key={i} delay={i * 0.1}>
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-200 relative h-full flex flex-col justify-between">
                    <div>
                      <Quote className="w-10 h-10 text-brand-100 absolute top-6 right-6" />
                      <div className="flex gap-1 mb-6 text-accent-500">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                      <p className="text-dark-700 leading-relaxed mb-8 italic">&quot;{testimonial.quote}&quot;</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-dark-900">{testimonial.name}</h4>
                        <p className="text-sm text-dark-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing Section ──────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 px-6 relative">
          <div className="absolute inset-0 bg-brand-500/5 -skew-y-3 z-0" />
          <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center">
            <FadeUp>
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-dark-900 mb-4">
                  Simple, transparent <span className="bg-gradient-to-tr from-[#bbf7d0] to-[#86efac] px-3 py-0.5 rounded-lg text-dark-900 inline-block rotate-2 shadow-sm ring-2 ring-[#bbf7d0]/50">pricing</span>
                </h2>
                <p className="text-lg text-dark-600">
                  Start for free, upgrade when you need it.
                </p>
              </div>
            </FadeUp>
            <div className="w-full">
              <Pricing />
            </div>
          </div>
        </section>

        {/* ── Contact Section ──────────────────────────────────────────────── */}
        <section id="contact" className="py-24 px-6 border-t border-surface-200 bg-white">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-start">
            <div className="md:w-5/12 pt-4">
              <FadeUp>
                <p className="text-xs font-semibold tracking-widest text-brand-500 uppercase mb-3">
                  Your feedback matters
                </p>
                <h2 className="text-3xl font-bold text-dark-900 mb-4 leading-tight">
                  Let's build <span className="bg-gradient-to-tr from-[#bbf7d0] to-[#86efac] px-3 py-0.5 rounded-lg text-dark-900 inline-block -rotate-2 shadow-sm ring-2 ring-[#bbf7d0]/50">WebDrawing</span> together
                </h2>
                <p className="text-dark-500 leading-relaxed text-lg">
                  You're among the first to test our product. If you have a suggestion, feedback or a specific need for your team, drop us a message!
                </p>
              </FadeUp>
            </div>
            
            <div className="md:w-7/12 w-full bg-surface-50 p-8 rounded-2xl border border-surface-200 shadow-sm">
              <FadeUp delay={0.1}>
                <form action="https://formspree.io/f/mojgwnrr" method="POST" className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-sm font-medium text-dark-900 ml-1">First name</label>
                      <input type="text" id="name" name="name" required placeholder="John" className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm transition-all shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-dark-900 ml-1">Work Email</label>
                      <input type="email" id="email" name="email" required placeholder="john@studio.com" className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm transition-all shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                      <label htmlFor="message" className="text-sm font-medium text-dark-900 ml-1">Message</label>
                      <textarea id="message" name="message" required rows={4} placeholder="The tool is great, but I'd love to see..." className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm transition-all resize-none shadow-sm"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-dark-900 hover:bg-dark-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 group mt-2">
                    Send
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ──────────────────────────────────────────────── */}
        <section id="faq" className="py-24 px-6 border-t border-surface-200 bg-surface-50">
          <div className="max-w-3xl mx-auto">
            <FadeUp>
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-dark-900 mb-4">
                  Frequently Asked <span className="bg-gradient-to-tr from-[#bbf7d0] to-[#86efac] px-3 py-0.5 rounded-lg text-dark-900 inline-block rotate-2 shadow-sm ring-2 ring-[#bbf7d0]/50">Questions</span>
                </h2>
                <p className="text-lg text-dark-600">
                  Got questions? We've got answers.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <FAQAccordion 
                data={[
                  { value: "faq-1", title: "What 3D formats are supported?", content: "Currently, WebDrawing supports GLB and glTF formats which are perfect for fast web rendering. We recommend exporting your CAD models to GLB from your software." },
                  { value: "faq-2", title: "Do my clients need to install an app or plugin?", content: "Not at all. WebDrawing is 100% web-based. Your clients simply click the link and the 3D model opens instantly in their web browser." },
                  { value: "faq-3", title: "Are my designs secure?", content: "Yes. Your files are private by default. You can also add password protection to your sharing links and set automatic expiration dates to maintain full control." },
                  { value: "faq-4", title: "Is there a free trial?", content: "Yes, we offer a 1-month free trial so you can test the platform before committing. A credit card is required to sign up, but you won't be charged until the trial ends." }
                ]}
              />
            </FadeUp>
          </div>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-[#2A4C2E] text-white py-8 px-6 mt-24 rounded-t-3xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-white">WebDrawing</span>
          </div>
          
          <p className="text-sm text-white/80">
            © {new Date().getFullYear()} WebDrawing. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
