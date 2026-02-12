'use client';

import Link from 'next/link';
import {
  MessageSquare,
  Phone,
  Instagram,
  ArrowRight,
  Check,
} from 'lucide-react';

import { Spotlight } from "@/components/aceternity/spotlight";
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { WobbleCard } from "@/components/aceternity/wobble-card";
import { InfiniteMovingCards } from "@/components/aceternity/infinite-moving-cards";
import { BackgroundBeams } from "@/components/aceternity/background-beams";

export default function Home() {
  const testimonials = [
    {
      quote: "Jawab has completely transformed how we handle booking. Our missed call rate dropped to zero overnight.",
      name: "Ahmed Al-Sayed",
      title: "Owner, Al-Sayed Salon",
    },
    {
      quote: "The bilingual support is incredible. It switches between Arabic and English so naturally, my customers don't even know it's AI.",
      name: "Fatima Khalid",
      title: "Manager, Healthy Eats Dubai",
    },
    {
      quote: "Setting it up took less than 10 minutes. Now it handles 500+ WhatsApp messages a day for us.",
      name: "Rashed Mahmoud",
      title: "Director, Gulf Real Estate",
    },
    {
      quote: "Finally an AI solution that actually understands the local dialect. Highly recommended for any UAE business.",
      name: "Sarah Williams",
      title: "Clinic Director, Smile Dental",
    },
  ];

  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden flex flex-col">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">ج</div>
            <span className="text-xl font-bold text-white tracking-tight">Jawab</span>
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-neutral-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="text-neutral-300 hover:text-white text-sm font-medium px-4 py-2">Login</Link>
            <Link href="/signup" className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-[45rem] w-full rounded-md flex flex-col items-center justify-center relative overflow-visible pt-40 pb-20">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />
        <div className="p-4 max-w-7xl mx-auto relative z-10 w-full text-center">
          <h1 className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 pb-4">
            Your AI Employee <br /> that never sleeps.
          </h1>
          <div className="mt-8 font-normal text-base text-neutral-300 max-w-lg mx-auto">
            <TextGenerateEffect words="Stop losing customers to missed calls. Jawab handles WhatsApp, Calls, and Instagram in Arabic & English — 24/7." />
          </div>
          <div className="mt-12 flex justify-center gap-4">
            <Link href="/signup" className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold transition duration-200 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/50">
              Start Free Trial
            </Link>
            <button className="px-8 py-3 rounded-full bg-transparent border border-neutral-600 text-neutral-300 font-bold transition duration-200 hover:bg-neutral-800">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section (Wobble Cards) */}
      <section id="features" className="py-24 bg-neutral-950 relative z-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-20">
            Everything you need to <span className="text-blue-500">scale.</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
            <WobbleCard
              containerClassName="col-span-1 lg:col-span-2 h-full bg-pink-800 min-h-[400px] lg:min-h-[300px]"
              className=""
            >
              <div className="max-w-xs relative z-10">
                <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                  WhatsApp Automation
                </h2>
                <p className="mt-4 text-left  text-base/6 text-neutral-200">
                  Instant responses to booking inquiries, FAQs, and support tickets. Integrated directly with your business number.
                </p>
              </div>
              <MessageSquare className="absolute -right-4 -bottom-10 md:-right-[40%] lg:-right-[10%] w-64 h-64 text-white/10 z-0" />
            </WobbleCard>
            <WobbleCard containerClassName="col-span-1 min-h-[300px]">
              <div className="relative z-10">
                <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                  Human-like Voice AI
                </h2>
                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                  Answers phone calls with natural Arabic & English voices. Zero latency.
                </p>
              </div>
              <Phone className="absolute -right-2 -bottom-6 w-32 h-32 text-white/10 z-0" />
            </WobbleCard>
            <WobbleCard containerClassName="col-span-1 lg:col-span-3 bg-blue-900 min-h-[400px] lg:min-h-[600px] xl:min-h-[300px]">
              <div className="max-w-sm relative z-10">
                <h2 className="max-w-sm md:max-w-lg  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                  Instagram & Smart Scheduling
                </h2>
                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                  Replies to DMs and Story mentions. Syncs automatically with Google Calendar, Fresha, and more.
                </p>
              </div>
              <Instagram className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 z-0" />
            </WobbleCard>
          </div>
        </div>
      </section>

      {/* Testimonials (Infinite Moving Cards) */}
      <section id="testimonials" className="py-24 bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden">
        <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-12 z-20">
          Trusted by the best.
        </h2>
        <InfiniteMovingCards
          items={testimonials}
          direction="right"
          speed="slow"
        />
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-black relative z-30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-6">
            Simple pricing, <span className="text-blue-500">no surprises.</span>
          </h2>
          <p className="text-neutral-400 mb-16 text-lg">Choose the perfect plan for your business size.</p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Starter */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 flex flex-col items-start hover:border-neutral-700 transition duration-200">
              <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
              <div className="text-4xl font-bold text-white mb-6">349 <span className="text-sm font-normal text-neutral-500">AED/mo</span></div>
              <ul className="space-y-4 mb-8 w-full">
                {["WhatsApp Only", "500 Conversations", "Basic Analytics"].map(i => (
                  <li key={i} className="flex items-center text-neutral-400">
                    <Check className="w-5 h-5 text-blue-500 mr-2" /> {i}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 mt-auto rounded-lg border border-neutral-700 text-white font-medium hover:bg-neutral-800 transition">Choose Starter</button>
            </div>

            {/* Professional (Removed negative translate, reduced shadow complexity) */}
            <div className="relative rounded-2xl border-2 border-blue-500/80 bg-neutral-900 p-8 flex flex-col items-start shadow-2xl shadow-blue-900/40">
              <div className="absolute -top-4 left-0 right-0 mx-auto w-fit px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white uppercase shadow-lg">Most Popular</div>
              <h3 className="text-xl font-semibold text-white mb-2 mt-2">Professional</h3>
              <div className="text-4xl font-bold text-white mb-6">899 <span className="text-sm font-normal text-neutral-500">AED/mo</span></div>
              <ul className="space-y-4 mb-8 w-full">
                {["WhatsApp + Voice AI", "2,000 Conversations", "Advanced Analytics", "Priority Support"].map(i => (
                  <li key={i} className="flex items-center text-neutral-300">
                    <Check className="w-5 h-5 text-blue-500 mr-2" /> {i}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 mt-auto rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition shadow-lg shadow-blue-500/25">Choose Professional</button>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 flex flex-col items-start hover:border-neutral-700 transition duration-200">
              <h3 className="text-xl font-semibold text-white mb-2">Business</h3>
              <div className="text-4xl font-bold text-white mb-6">1,499 <span className="text-sm font-normal text-neutral-500">AED/mo</span></div>
              <ul className="space-y-4 mb-8 w-full">
                {["All Channels Unlimited", "Custom Integrations", "Dedicated Account Mgr"].map(i => (
                  <li key={i} className="flex items-center text-neutral-400">
                    <Check className="w-5 h-5 text-blue-500 mr-2" /> {i}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 mt-auto rounded-lg border border-neutral-700 text-white font-medium hover:bg-neutral-800 transition">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section (Background Beams) */}
      <section className="min-h-[40rem] w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
        <div className="max-w-2xl mx-auto p-4 z-10 text-center">
          <h2 className="relative z-10 text-lg md:text-7xl  bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold">
            Join the revolution.
          </h2>
          <p></p>
          <p className="text-neutral-500 max-w-lg mx-auto my-6 text-xl text-center relative z-10">
            Experience the power of AI that truly understands your business. No credit card required.
          </p>
          <Link href="/signup" className="relative z-10 inline-block px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition">
            Get Started Now
          </Link>
        </div>
        <BackgroundBeams />
      </section>

      {/* Footer */}
      <footer className="py-10 bg-black border-t border-white/10 text-center">
        <p className="text-neutral-500">© 2025 Jawab Technologies. All rights reserved.</p>
      </footer>

    </div>
  );
}
