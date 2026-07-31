'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Phone,
  Instagram,
  ArrowRight,
  Check,
  PlayCircle,
  CalendarCheck,
  Settings2,
  Rocket,
  ShieldCheck,
  Globe2,
} from 'lucide-react';

import { Spotlight } from "@/components/aceternity/spotlight";
import { WobbleCard } from "@/components/aceternity/wobble-card";
import { InfiniteMovingCards } from "@/components/aceternity/infinite-moving-cards";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { Navbar } from "@/components/marketing/navbar";
import { ChatMockup } from "@/components/marketing/chat-mockup";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/reveal";
import { Counter } from "@/components/marketing/counter";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { LogoMark } from "@/components/marketing/logo";

const testimonials = [
  {
    quote: "★★★★★ Jawab has completely transformed how we handle booking. Our missed call rate dropped to zero overnight.",
    name: "Ahmed Al-Sayed",
    title: "Owner, Al-Sayed Salon",
  },
  {
    quote: "★★★★★ The bilingual support is incredible. It switches between Arabic and English so naturally, my customers don't even know it's AI.",
    name: "Fatima Khalid",
    title: "Manager, Healthy Eats Dubai",
  },
  {
    quote: "★★★★★ Setting it up took less than 10 minutes. Now it handles 500+ WhatsApp messages a day for us.",
    name: "Rashed Mahmoud",
    title: "Director, Gulf Real Estate",
  },
  {
    quote: "★★★★★ Finally an AI solution that actually understands the local dialect. Highly recommended for any UAE business.",
    name: "Sarah Williams",
    title: "Clinic Director, Smile Dental",
  },
];

const trustedBy = ["Al-Sayed Salon", "Healthy Eats Dubai", "Gulf Real Estate", "Smile Dental", "Marina Fitness", "Oasis Spa"];

const steps = [
  {
    icon: Settings2,
    title: "Connect your channels",
    description: "Link WhatsApp, your phone number, and Instagram in a guided setup — no code, no IT team required.",
  },
  {
    icon: Rocket,
    title: "Train it on your business",
    description: "Add your services, hours, and FAQs. Jawab learns your voice and answers exactly the way you would.",
  },
  {
    icon: CalendarCheck,
    title: "Go live in minutes",
    description: "Jawab starts answering calls, chats, and DMs immediately — booking real appointments on your calendar.",
  },
];

const plans = [
  {
    name: "Starter",
    monthly: 349,
    annualMonthly: 279,
    features: ["WhatsApp Only", "500 Conversations/mo", "Basic Analytics", "Email Support"],
    cta: "Choose Starter",
    popular: false,
  },
  {
    name: "Professional",
    monthly: 899,
    annualMonthly: 719,
    features: ["WhatsApp + Voice AI", "2,000 Conversations/mo", "Advanced Analytics", "Priority Support", "Google Calendar Sync"],
    cta: "Choose Professional",
    popular: true,
  },
  {
    name: "Business",
    monthly: 1499,
    annualMonthly: 1199,
    features: ["All Channels, Unlimited", "Custom Integrations", "Dedicated Account Mgr", "SLA & Onboarding"],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Home() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-black antialiased relative overflow-hidden flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full pt-40 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white bg-radial-fade pointer-events-none" />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <div className="px-4 max-w-7xl mx-auto relative z-10 w-full grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-neutral-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live in 500+ MENA businesses
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300 pb-4 text-glow">
                Your AI Employee <br /> that never sleeps.
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 font-normal text-lg text-neutral-300 max-w-lg mx-auto lg:mx-0">
                Stop losing customers to missed calls. Jawab handles WhatsApp, Calls, and Instagram in Arabic &amp; English — 24/7.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <Link
                  href="/signup"
                  className="group px-8 py-3.5 rounded-full bg-blue-600 text-white font-bold transition duration-200 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <button className="px-8 py-3.5 rounded-full bg-transparent border border-neutral-700 text-neutral-300 font-bold transition duration-200 hover:bg-neutral-800 hover:border-neutral-600 flex items-center justify-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-white">
                    <Counter value={500} suffix="+" />
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">Businesses</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-white">
                    <Counter value={2} prefix="<" suffix="s" />
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">Response time</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-white">
                    <Counter value={99} suffix="%" />
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">Uptime</p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="hidden lg:block">
            <ChatMockup />
          </Reveal>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-10 border-y border-white/5 bg-neutral-950/60 relative z-20">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs uppercase tracking-widest text-neutral-500 mb-6">
            Trusted by ambitious businesses across the UAE
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-neutral-500 font-semibold text-lg">
            {trustedBy.map((name) => (
              <span key={name} className="opacity-70 hover:opacity-100 transition-opacity">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section (Wobble Cards) */}
      <section id="features" className="py-24 bg-neutral-950 relative z-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-4">
              Everything you need to <span className="text-blue-500">scale.</span>
            </h2>
            <p className="text-center text-neutral-400 max-w-xl mx-auto mb-20">
              One AI employee, every channel your customers already use.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
            <Reveal className="col-span-1 lg:col-span-2" delay={0.05}>
              <WobbleCard containerClassName="h-full bg-pink-800 min-h-[400px] lg:min-h-[300px]">
                <div className="max-w-xs relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    WhatsApp Automation
                  </h2>
                  <p className="mt-4 text-left text-base/6 text-neutral-200">
                    Instant responses to booking inquiries, FAQs, and support tickets. Integrated directly with your business number.
                  </p>
                </div>
                <MessageSquare className="absolute -right-4 -bottom-10 md:-right-[40%] lg:-right-[10%] w-64 h-64 text-white/10 z-0" />
              </WobbleCard>
            </Reveal>

            <Reveal delay={0.1}>
              <WobbleCard containerClassName="min-h-[300px] h-full">
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="max-w-80 text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    Human-like Voice AI
                  </h2>
                  <p className="mt-4 max-w-[26rem] text-left text-base/6 text-neutral-200">
                    Answers phone calls with natural Arabic &amp; English voices. Zero latency.
                  </p>
                </div>
                <Phone className="absolute -right-2 -bottom-6 w-32 h-32 text-white/10 z-0" />
              </WobbleCard>
            </Reveal>

            <Reveal className="col-span-1 lg:col-span-3" delay={0.15}>
              <WobbleCard containerClassName="bg-blue-900 min-h-[400px] lg:min-h-[600px] xl:min-h-[300px]">
                <div className="max-w-sm relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="max-w-sm md:max-w-lg text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    Instagram &amp; Smart Scheduling
                  </h2>
                  <p className="mt-4 max-w-[26rem] text-left text-base/6 text-neutral-200">
                    Replies to DMs and Story mentions. Syncs automatically with Google Calendar, Fresha, and more.
                  </p>
                </div>
                <Instagram className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 z-0" />
              </WobbleCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-black relative z-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-4">
              Live in <span className="text-blue-500">three steps.</span>
            </h2>
            <p className="text-center text-neutral-400 max-w-xl mx-auto mb-16">
              No developers. No lengthy onboarding calls. Just a working AI employee, fast.
            </p>
          </Reveal>

          <RevealGroup className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto relative">
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            {steps.map((step, idx) => (
              <RevealItem key={step.title}>
                <div className="relative flex flex-col items-center text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center mb-6 relative z-10 shadow-lg shadow-black/40">
                    <step.icon className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-xs font-bold text-blue-500 mb-2">STEP {idx + 1}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">{step.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Testimonials (Infinite Moving Cards) */}
      <section id="testimonials" className="py-24 bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-12 z-20">
            Trusted by the best.
          </h2>
        </Reveal>
        <InfiniteMovingCards items={testimonials} direction="right" speed="slow" />
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-black relative z-30">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-6">
              Simple pricing, <span className="text-blue-500">no surprises.</span>
            </h2>
            <p className="text-neutral-400 mb-10 text-lg">Choose the perfect plan for your business size.</p>
            <div className="flex justify-center mb-16">
              <PricingToggle annual={annual} onChange={setAnnual} />
            </div>
          </Reveal>

          <RevealGroup className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan) => (
              <RevealItem key={plan.name}>
                <div
                  className={`relative h-full rounded-2xl p-8 flex flex-col items-start transition duration-200 ${
                    plan.popular
                      ? "border-2 border-blue-500/80 bg-neutral-900 shadow-2xl shadow-blue-900/40"
                      : "border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 mx-auto w-fit px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white uppercase shadow-lg">
                      Most Popular
                    </div>
                  )}
                  <h3 className={`text-xl font-semibold text-white mb-2 ${plan.popular ? "mt-2" : ""}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold text-white">
                      {annual ? plan.annualMonthly : plan.monthly}
                    </span>
                    <span className="text-sm font-normal text-neutral-500">AED/mo</span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-6">
                    {annual ? "billed annually" : "billed monthly"}
                  </p>
                  <ul className="space-y-4 mb-8 w-full text-left">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center text-neutral-300">
                        <Check className="w-5 h-5 text-blue-500 mr-2 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`w-full py-3 mt-auto rounded-lg text-center font-medium transition ${
                      plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25"
                        : "border border-neutral-700 text-white hover:bg-neutral-800"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-neutral-500">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500" /> No credit card required</span>
              <span className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-blue-500" /> Cancel anytime</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-500" /> 14-day free trial</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-neutral-950 relative z-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-4">
              Frequently asked <span className="text-blue-500">questions.</span>
            </h2>
            <p className="text-center text-neutral-400 max-w-xl mx-auto mb-16">
              Everything you need to know before getting started.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <FaqAccordion />
          </Reveal>
        </div>
      </section>

      {/* CTA Section (Background Beams) */}
      <section className="min-h-[40rem] w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
        <div className="max-w-2xl mx-auto p-4 z-10 text-center">
          <Reveal>
            <h2 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold">
              Join the revolution.
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="text-neutral-500 max-w-lg mx-auto my-6 text-xl text-center relative z-10">
              Experience the power of AI that truly understands your business. No credit card required.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Link
              href="/signup"
              className="relative z-10 inline-block px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition"
            >
              Get Started Now
            </Link>
          </Reveal>
        </div>
        <BackgroundBeams />
      </section>

      {/* Footer */}
      <footer className="pt-16 pb-10 bg-black border-t border-white/10 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 pb-12">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <LogoMark status />
                <span className="text-xl font-bold text-white tracking-tight">Jawab</span>
              </Link>
              <p className="text-neutral-500 text-sm max-w-xs leading-relaxed">
                The AI employee that answers your calls, WhatsApp, and Instagram — in Arabic and English, 24/7.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Customers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-neutral-500 text-sm">© 2026 Jawab Technologies. All rights reserved.</p>
            <p className="text-neutral-600 text-xs">Made for MENA SMEs 🇦🇪</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
