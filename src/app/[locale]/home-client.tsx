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
import { useI18n, useLocalizedHref } from "@/i18n/context";

const stepIcons = [Settings2, Rocket, CalendarCheck];
const planMonthly = [349, 899, 1499];
const planAnnualMonthly = [279, 719, 1199];

export function HomeClient() {
  const { dict } = useI18n();
  const href = useLocalizedHref();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-black antialiased relative overflow-hidden flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full pt-40 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white bg-radial-fade pointer-events-none" />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <div className="px-4 max-w-7xl mx-auto relative z-10 w-full grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-start">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-neutral-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {dict.hero.badge}
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300 pb-4 text-glow">
                {dict.hero.titleLine1} <br /> {dict.hero.titleLine2}
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 font-normal text-lg text-neutral-300 max-w-lg mx-auto lg:mx-0">
                {dict.hero.subtitle}
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <Link
                  href={href('/signup')}
                  className="group px-8 py-3.5 rounded-full bg-blue-600 text-white font-bold transition duration-200 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                >
                  {dict.hero.ctaPrimary}
                  <ArrowRight className="w-4 h-4 transition-transform rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
                <button className="px-8 py-3.5 rounded-full bg-transparent border border-neutral-700 text-neutral-300 font-bold transition duration-200 hover:bg-neutral-800 hover:border-neutral-600 flex items-center justify-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  {dict.hero.ctaSecondary}
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
                <div className="text-center lg:text-start">
                  <p className="text-3xl font-bold text-white">
                    <Counter value={500} suffix="+" />
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">{dict.hero.statBusinesses}</p>
                </div>
                <div className="text-center lg:text-start">
                  <p className="text-3xl font-bold text-white">
                    <Counter value={2} prefix="<" suffix="s" />
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">{dict.hero.statResponseTime}</p>
                </div>
                <div className="text-center lg:text-start">
                  <p className="text-3xl font-bold text-white">
                    <Counter value={99} suffix="%" />
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">{dict.hero.statUptime}</p>
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
            {dict.trustBar.label}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-neutral-500 font-semibold text-lg">
            {dict.trustBar.names.map((name) => (
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
              {dict.features.heading} <span className="text-blue-500">{dict.features.headingAccent}</span>
            </h2>
            <p className="text-center text-neutral-400 max-w-xl mx-auto mb-20">
              {dict.features.subheading}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
            <Reveal className="col-span-1 lg:col-span-2" delay={0.05}>
              <WobbleCard containerClassName="h-full bg-pink-800 min-h-[400px] lg:min-h-[300px]">
                <div className="max-w-xs relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-start text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    {dict.features.whatsappTitle}
                  </h2>
                  <p className="mt-4 text-start text-base/6 text-neutral-200">
                    {dict.features.whatsappBody}
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
                  <h2 className="max-w-80 text-start text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    {dict.features.voiceTitle}
                  </h2>
                  <p className="mt-4 max-w-[26rem] text-start text-base/6 text-neutral-200">
                    {dict.features.voiceBody}
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
                  <h2 className="max-w-sm md:max-w-lg text-start text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    {dict.features.instagramTitle}
                  </h2>
                  <p className="mt-4 max-w-[26rem] text-start text-base/6 text-neutral-200">
                    {dict.features.instagramBody}
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
              {dict.howItWorks.heading} <span className="text-blue-500">{dict.howItWorks.headingAccent}</span>
            </h2>
            <p className="text-center text-neutral-400 max-w-xl mx-auto mb-16">
              {dict.howItWorks.subheading}
            </p>
          </Reveal>

          <RevealGroup className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto relative">
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            {[
              { title: dict.howItWorks.step1Title, body: dict.howItWorks.step1Body },
              { title: dict.howItWorks.step2Title, body: dict.howItWorks.step2Body },
              { title: dict.howItWorks.step3Title, body: dict.howItWorks.step3Body },
            ].map((step, idx) => {
              const Icon = stepIcons[idx];
              return (
                <RevealItem key={step.title}>
                  <div className="relative flex flex-col items-center text-center px-4">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center mb-6 relative z-10 shadow-lg shadow-black/40">
                      <Icon className="w-7 h-7 text-blue-400" />
                    </div>
                    <div className="text-xs font-bold text-blue-500 mb-2">{dict.howItWorks.stepLabel} {idx + 1}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">{step.body}</p>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* Testimonials (Infinite Moving Cards) */}
      <section id="testimonials" className="py-24 bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-12 z-20">
            {dict.testimonials.heading}
          </h2>
        </Reveal>
        <InfiniteMovingCards items={dict.testimonials.items} direction="right" speed="slow" />
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-black relative z-30">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-6">
              {dict.pricing.heading} <span className="text-blue-500">{dict.pricing.headingAccent}</span>
            </h2>
            <p className="text-neutral-400 mb-10 text-lg">{dict.pricing.subheading}</p>
            <div className="flex justify-center mb-16">
              <PricingToggle annual={annual} onChange={setAnnual} />
            </div>
          </Reveal>

          <RevealGroup className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {dict.pricing.plans.map((plan, idx) => {
              const popular = idx === 1;
              return (
                <RevealItem key={plan.name}>
                  <div
                    className={`relative h-full rounded-2xl p-8 flex flex-col items-start transition duration-200 ${
                      popular
                        ? "border-2 border-blue-500/80 bg-neutral-900 shadow-2xl shadow-blue-900/40"
                        : "border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                    }`}
                  >
                    {popular && (
                      <div className="absolute -top-4 left-0 right-0 mx-auto w-fit px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white uppercase shadow-lg">
                        {dict.pricing.mostPopular}
                      </div>
                    )}
                    <h3 className={`text-xl font-semibold text-white mb-2 ${popular ? "mt-2" : ""}`}>{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-white">
                        {annual ? planAnnualMonthly[idx] : planMonthly[idx]}
                      </span>
                      <span className="text-sm font-normal text-neutral-500">{dict.pricing.perMonth}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mb-6">
                      {annual ? dict.pricing.billedAnnually : dict.pricing.billedMonthly}
                    </p>
                    <ul className="space-y-4 mb-8 w-full text-start">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center text-neutral-300">
                          <Check className="w-5 h-5 text-blue-500 me-2 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={href('/signup')}
                      className={`w-full py-3 mt-auto rounded-lg text-center font-medium transition ${
                        popular
                          ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25"
                          : "border border-neutral-700 text-white hover:bg-neutral-800"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>

          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-neutral-500">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500" /> {dict.pricing.noCreditCard}</span>
              <span className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-blue-500" /> {dict.pricing.cancelAnytime}</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-500" /> {dict.pricing.freeTrial}</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-neutral-950 relative z-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-4">
              {dict.faq.heading} <span className="text-blue-500">{dict.faq.headingAccent}</span>
            </h2>
            <p className="text-center text-neutral-400 max-w-xl mx-auto mb-16">
              {dict.faq.subheading}
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
              {dict.cta.title}
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="text-neutral-500 max-w-lg mx-auto my-6 text-xl text-center relative z-10">
              {dict.cta.subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Link
              href={href('/signup')}
              className="relative z-10 inline-block px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition"
            >
              {dict.cta.button}
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
              <Link href={href('/')} className="flex items-center gap-2.5 mb-4">
                <LogoMark status />
                <span className="text-xl font-bold text-white tracking-tight">Jawab</span>
              </Link>
              <p className="text-neutral-500 text-sm max-w-xs leading-relaxed">
                {dict.footer.description}
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">{dict.footer.product}</h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li><a href="#features" className="hover:text-white transition-colors">{dict.footer.featuresLink}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{dict.footer.pricingLink}</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">{dict.footer.howItWorksLink}</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">{dict.footer.faqLink}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">{dict.footer.company}</h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li><Link href={href('/login')} className="hover:text-white transition-colors">{dict.footer.loginLink}</Link></li>
                <li><Link href={href('/signup')} className="hover:text-white transition-colors">{dict.footer.getStartedLink}</Link></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">{dict.footer.customersLink}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">{dict.footer.legal}</h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-white transition-colors">{dict.footer.privacyLink}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{dict.footer.termsLink}</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-neutral-500 text-sm">{dict.footer.copyright}</p>
            <p className="text-neutral-600 text-xs">{dict.footer.tagline}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
