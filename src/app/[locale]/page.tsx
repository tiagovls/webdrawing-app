'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, UserButton } from '@clerk/nextjs'
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
} from 'lucide-react'
import { Pricing } from '@/components/blocks/pricing'
import { PlanBadge } from '@/components/blocks/plan-badge'

const features = [
  {
    icon: Share2,
    title: 'Zero friction',
    desc: 'Your clients open the link directly. No installation, no account required.',
  },
  {
    icon: Ruler,
    title: 'Measurement tools',
    desc: 'Measure distances, edges and diameters directly in 3D, like in SolidWorks.',
  },
  {
    icon: MessageSquare,
    title: 'Spatial annotations',
    desc: 'Drop comments directly on 3D geometry. Asynchronous collaboration.',
  },
  {
    icon: Shield,
    title: 'Secure sharing',
    desc: 'Password protection, automatic expiration date. The source file remains private.',
  },
  {
    icon: Eye,
    title: 'Complex assemblies',
    desc: 'Navigate the model tree. Hide/show each sub-component.',
  },
  {
    icon: Share2,
    title: 'Just one link',
    desc: 'Generate a unique URL in one click. Share via email, Slack or Teams.',
  },
]

const steps = [
  { num: '01', title: 'Upload your 3D model', desc: 'Drag and drop your file from Fusion 360, FreeCAD or any CAD software.' },
  { num: '02', title: 'Configure sharing', desc: 'Optional: add a password and expiration date in 30 seconds.' },
  { num: '03', title: 'Send the link', desc: 'Your client opens the interactive 3D model directly in their browser.' },
]

const FadeUp = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
  >
    {children}
  </motion.div>
)

export default function LandingPage() {
  const { isSignedIn } = useAuth()
  const [scrolled, setScrolled] = useState(false)

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

          <div className="flex items-center gap-3">
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
                  Start for free
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
                  <UserButton />
                  <PlanBadge />
                </div>
              </>
            )}
          </div>
        </div>
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
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
              Zero installation • Zero account for your clients
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 drop-shadow-lg">
              The Figma of{' '}
              <span className="text-accent-500">Mechanical Engineering</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow">
              Share your 3D models with your clients with one link. They rotate, measure,
              annotate — directly in their browser. No more emails with screenshots.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              <Link
                href="#how"
                className="inline-flex items-center gap-2 text-white hover:text-white/80 font-medium px-6 py-3.5 rounded-xl border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all"
              >
                See how it works
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-surface-50">

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="how" className="py-24 px-6 max-w-5xl mx-auto scroll-mt-24">
          <FadeUp>
            <p className="text-center text-xs font-semibold tracking-widest text-brand-500 uppercase mb-3">
              Workflow
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-dark-900 mb-16">
              From CAD export to client in 3 steps
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <FadeUp key={step.num} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-6 h-full border border-surface-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="text-4xl font-black text-surface-200 group-hover:text-brand-200 transition-colors mb-4 font-mono">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-lg text-dark-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-dark-700 leading-relaxed">{step.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto mb-12 scroll-mt-24 border-t border-surface-200">
          <div className="max-w-3xl mb-16">
            <FadeUp>
              <h2 className="text-3xl sm:text-4xl font-bold text-dark-900 mb-4 tracking-tight">
                Everything eDrawings should have been
              </h2>
              <p className="text-lg text-dark-500">
                Advanced engineering tools in an ultra-fast web interface. No more heavy files to send.
              </p>
            </FadeUp>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            {features.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.07}>
                <div className="group relative">
                  <div className="absolute -inset-4 rounded-xl bg-surface-100/50 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
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

        {/* ── Pricing Section ──────────────────────────────────────────────── */}
        <section id="pricing" className="py-16 px-6 relative">
          <div className="absolute inset-0 bg-brand-500/5 -skew-y-3 z-0" />
          <div className="relative z-10 max-w-7xl mx-auto">
            <Pricing />
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
                  Let's build WebDrawing together
                </h2>
                <p className="text-dark-500 leading-relaxed text-lg">
                  You are among the first to test our solution. If you have a suggestion, remark or specific need for your company, leave us a message!
                </p>
              </FadeUp>
            </div>
            
            <div className="md:w-7/12 w-full bg-surface-50 p-8 rounded-2xl border border-surface-200 shadow-sm">
              <FadeUp delay={0.1}>
                <form action="https://formspree.io/f/mojgwnrr" method="POST" className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-sm font-medium text-dark-900 ml-1">First Name</label>
                      <input type="text" id="name" name="name" required placeholder="John" className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm transition-all shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-dark-900 ml-1">Work Email</label>
                      <input type="email" id="email" name="email" required placeholder="john@studio.com" className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm transition-all shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-sm font-medium text-dark-900 ml-1">Message</label>
                    <textarea id="message" name="message" required rows={4} placeholder="I find the tool great, but I'm missing..." className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm transition-all resize-none shadow-sm"></textarea>
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

      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-brand-500 text-white py-16 px-6 mt-12 rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">WebDrawing</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              The Figma of Mechanical Engineering. Share, visualize and annotate your 3D models with ease.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-6 text-white">Product</h4>
            <ul className="space-y-4 text-sm text-white/70">
              <li><Link href="#how" className="hover:text-white transition-colors">How it works</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-6 text-white">Resources</h4>
            <ul className="space-y-4 text-sm text-white/70">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href="#contact" className="hover:text-white transition-colors">Contact us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-6 text-white">Legal</h4>
            <ul className="space-y-4 text-sm text-white/70">
              <li><Link href="#" className="hover:text-white transition-colors">Legal Notice</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} WebDrawing. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-white/60">
            <span>Made with passion for engineers.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
