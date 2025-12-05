'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Custom hook for intersection observer
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element); // Only animate once
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px', ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
}

// Animate on scroll wrapper component
function AnimateOnScroll({ children, className = '', delay = 0 }) {
  const [ref, isInView] = useInView();
  
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        isInView 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Separator component
function Separator() {
  return <div className="w-full max-w-6xl mx-auto px-6 py-4"><div className="border-t border-border/50" /></div>;
}

// Hero Section - with warm gradient background
function HeroSection() {
  const [animationKey, setAnimationKey] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Animation cycle: fade in messages -> hold -> fade out -> reset
  useEffect(() => {
    // Total cycle: ~5s fade in + 2s hold + 1s fade out = ~8s
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 7000); // Start fading out at 7s

    const resetTimer = setTimeout(() => {
      setIsFadingOut(false);
      setAnimationKey(prev => prev + 1);
    }, 8500); // Reset at 8.5s

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(resetTimer);
    };
  }, [animationKey]);

  return (
    <section className="relative flex flex-col items-center overflow-hidden pt-16 md:pt-40">
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Main headline - Larger serif */}
        <h1 className="font-instrument-serif text-6xl md:text-7xl lg:text-8xl text-foreground mb-5 leading-[1.1] tracking-tight">
          Open source contributions,
          <br />
          <span className="italic">rewarded instantly</span>
        </h1>
        
        {/* Subheadline - Smaller */}
        <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
          Fund GitHub issues with crypto bounties. Contributors get paid automatically when their pull requests merge.
        </p>
        
        {/* Single CTA Button - Completely rounded */}
        <Link 
          href="/app" 
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-full transition-all duration-300 hover:opacity-90 hover:shadow-lg"
        >
          Get started
        </Link>
      </div>

      {/* Product mockup - GitHub issue comments style */}
      <div className="relative z-10 w-full max-w-4xl mx-auto mt-12 md:mt-20 px-4 md:px-0 pb-8">
        <div className="bg-card rounded-lg md:rounded-xl border border-border shadow-2xl shadow-foreground/5 overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 border-b border-border bg-secondary/30">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground/20" />
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground/20" />
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="px-1.5 md:px-2 py-0.5 bg-muted/50 rounded text-[8px] md:text-[10px] text-muted-foreground">
                github.com
              </div>
            </div>
          </div>
          
          {/* GitHub-style comments - graceful fade out transition */}
          <div 
            key={animationKey} 
            className={`p-4 md:p-6 lg:p-10 space-y-2 md:space-y-3 transition-opacity duration-1000 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
          >
            
            {/* Comment 1: BountyPay bot - Bounty Posted */}
            <div className="flex gap-2 md:gap-3 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_0.3s_forwards]">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1 border border-border rounded-md md:rounded-lg overflow-hidden">
                <div className="px-2 md:px-3 py-1 md:py-1.5 bg-muted/30 border-b border-border flex items-center gap-1 md:gap-1.5">
                  <span className="text-[10px] md:text-xs font-medium text-foreground">bountypay</span>
                  <span className="px-0.5 md:px-1 py-0.5 text-[6px] md:text-[8px] text-muted-foreground border border-border rounded">bot</span>
                  <span className="text-[8px] md:text-[10px] text-muted-foreground hidden sm:inline">3 days ago</span>
                </div>
                <div className="px-2 md:px-3 py-2 md:py-2.5">
                  <div className="flex items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
                    <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-[10px] md:text-xs font-medium text-foreground">Bounty: 500 USDC</span>
                  </div>
                  <div className="h-px bg-border mb-1.5 md:mb-2" />
                  <div className="space-y-0.5 text-[8px] md:text-[10px] text-muted-foreground">
                    <p><span className="text-foreground/70">Deadline:</span> Dec 15, 2025</p>
                    <p><span className="text-foreground/70">Status:</span> Open</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical connector line */}
            <div className="flex gap-2 md:gap-3 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_1.0s_forwards]">
              <div className="w-6 md:w-7 flex justify-center">
                <div className="w-px h-1.5 md:h-2 bg-border" />
              </div>
            </div>

            {/* Comment 2: PR linked */}
            <div className="flex gap-2 md:gap-3 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_1.4s_forwards]">
              <Image 
                src="/icons/avatar.svg" 
                alt="sarah-dev" 
                width={28} 
                height={28} 
                className="w-6 h-6 md:w-7 md:h-7 rounded-full flex-shrink-0"
              />
              <div className="flex-1 border border-border rounded-md md:rounded-lg overflow-hidden">
                <div className="px-2 md:px-3 py-1 md:py-1.5 bg-muted/30 border-b border-border flex items-center gap-1 md:gap-1.5">
                  <span className="text-[10px] md:text-xs font-medium text-foreground">sarah-dev</span>
                  <span className="text-[8px] md:text-[10px] text-muted-foreground hidden sm:inline">2 days ago</span>
                </div>
                <div className="px-2 md:px-3 py-2 md:py-2.5">
                  <p className="text-[10px] md:text-xs text-foreground">
                    Fixed in <span className="font-mono text-blue-600/70">#4522</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Vertical connector line */}
            <div className="flex gap-2 md:gap-3 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_2.1s_forwards]">
              <div className="w-6 md:w-7 flex justify-center">
                <div className="w-px h-1.5 md:h-2 bg-border" />
              </div>
            </div>

            {/* Event: PR Merged */}
            <div className="flex gap-2 md:gap-3 items-center opacity-0 animate-[fadeSlideIn_0.6s_ease-out_2.5s_forwards]">
              <div className="w-6 md:w-7 flex justify-center">
                <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border border-violet-300/50 bg-violet-50 flex items-center justify-center">
                  <svg className="w-1.5 h-1.5 md:w-2 md:h-2 text-violet-500/70" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z" />
                  </svg>
                </div>
              </div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">maintainer</span> merged PR <span className="font-mono text-blue-600/70">#4522</span><span className="hidden sm:inline"> · 1 hour ago</span>
              </p>
            </div>

            {/* Vertical connector line */}
            <div className="flex gap-2 md:gap-3 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_3.2s_forwards]">
              <div className="w-6 md:w-7 flex justify-center">
                <div className="w-px h-1.5 md:h-2 bg-border" />
              </div>
            </div>

            {/* Comment 3: BountyPay bot - Paid */}
            <div className="flex gap-2 md:gap-3 opacity-0 animate-[fadeSlideIn_0.6s_ease-out_3.6s_forwards]">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1 border border-border rounded-md md:rounded-lg overflow-hidden">
                <div className="px-2 md:px-3 py-1 md:py-1.5 bg-muted/30 border-b border-border flex items-center gap-1 md:gap-1.5">
                  <span className="text-[10px] md:text-xs font-medium text-foreground">bountypay</span>
                  <span className="px-0.5 md:px-1 py-0.5 text-[6px] md:text-[8px] text-muted-foreground border border-border rounded">bot</span>
                  <span className="text-[8px] md:text-[10px] text-muted-foreground hidden sm:inline">just now</span>
                </div>
                <div className="px-2 md:px-3 py-2 md:py-2.5">
                  <div className="flex items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
                    <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-[10px] md:text-xs font-medium text-foreground">Bounty: Paid</span>
                  </div>
                  <div className="h-px bg-border mb-1.5 md:mb-2" />
                  <div className="space-y-0.5 text-[8px] md:text-[10px] text-muted-foreground">
                    <p><span className="text-foreground/70">Recipient:</span> @sarah-dev</p>
                    <p><span className="text-foreground/70">Amount:</span> 500 USDC</p>
                    <p className="hidden sm:block"><span className="text-foreground/70">Transaction:</span> <span className="font-mono text-[7px] md:text-[9px] text-blue-600/70">View on Explorer →</span></p>
                  </div>
                  <p className="text-[8px] md:text-[10px] text-muted-foreground mt-1.5 md:mt-2 hidden sm:block">Payment has been sent successfully.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

// How It Works Section - Clean tabbed interface
function HowItWorksSection() {
  const [activeTab, setActiveTab] = useState('sponsor');

  const sponsorSteps = [
    { number: '01', title: 'Install the GitHub App', description: 'Add BountyPay to your repository with a single click.' },
    { number: '02', title: 'Fund an issue', description: 'Attach a bounty to any GitHub issue with USDC or MUSD.' },
    { number: '03', title: 'Automatic payment', description: 'Contributors are paid when their PR merges and closes the issue.' },
  ];

  const contributorSteps = [
    { number: '01', title: 'Browse bounties', description: 'Find issues that match your skills and interests.' },
    { number: '02', title: 'Submit your PR', description: 'Work on the issue and link your wallet to receive payments.' },
    { number: '03', title: 'Get paid instantly', description: 'Once merged, the bounty is transferred to your wallet.' },
  ];

  const steps = activeTab === 'sponsor' ? sponsorSteps : contributorSteps;

  return (
    <section id="how-it-works" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <AnimateOnScroll>
          <div className="text-center mb-12">
            <h2 className="font-instrument-serif text-4xl md:text-5xl text-foreground leading-tight">
              Simple by design
            </h2>
          </div>
        </AnimateOnScroll>

        {/* Tab switcher - Completely rounded */}
        <AnimateOnScroll delay={100}>
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1 bg-card/80 backdrop-blur-sm border border-border rounded-full">
              <button
                onClick={() => setActiveTab('sponsor')}
                className={`px-5 py-2 text-sm rounded-full transition-all duration-300 ${
                  activeTab === 'sponsor'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                For sponsors
              </button>
              <button
                onClick={() => setActiveTab('contributor')}
                className={`px-5 py-2 text-sm rounded-full transition-all duration-300 ${
                  activeTab === 'contributor'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                For contributors
              </button>
            </div>
          </div>
        </AnimateOnScroll>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step, index) => (
            <AnimateOnScroll key={step.number} delay={200 + index * 100}>
              <div className="text-center">
                <p className="text-xs tracking-[0.3em] text-muted-foreground/50 mb-3">
                  {step.number}
                </p>
                <h3 className="text-base text-foreground mb-2 font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// Features Section - Bento grid style
function FeaturesSection() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <AnimateOnScroll>
          <div className="text-center mb-12">
            <h2 className="font-instrument-serif text-4xl md:text-5xl text-foreground leading-tight mb-3">
              Built for absolute clarity
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Everything you need to fund and earn bounties, with tools that are simple and clear.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Bento grid */}
        <div className="grid md:grid-cols-2 md:grid-rows-2 gap-4">
          {/* Large feature card */}
          <AnimateOnScroll delay={100} className="md:row-span-2 h-full">
            <div className="p-6 bg-card/80 backdrop-blur-sm rounded-xl border border-border h-full">
              <h3 className="text-base font-medium text-foreground mb-2">Secure escrow</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Your funds are held in audited smart contracts until work is verified and merged.
              </p>
              {/* Escrow illustration - hidden on mobile */}
              <div className="hidden md:flex flex-1 rounded-lg items-center justify-center p-6">
                <img 
                  src="/icons/escrow.svg" 
                  alt="Secure escrow illustration" 
                  className="w-full h-full object-contain opacity-90 max-h-80"
                />
              </div>
            </div>
          </AnimateOnScroll>

          {/* Right column cards */}
          <AnimateOnScroll delay={200} className="h-full">
            <div className="p-6 bg-card/80 backdrop-blur-sm rounded-xl border border-border h-full flex flex-col">
              <h3 className="text-base font-medium text-foreground mb-2">Automatic payouts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When a PR merges and closes the bounty issue, payment is automatically transferred to the contributor.
              </p>
              {/* Pay illustration - hidden on mobile */}
              <img 
                src="/icons/pay.svg" 
                alt="Automatic payouts illustration" 
                className="hidden md:block mt-auto pt-4 h-16 w-auto mx-auto opacity-80"
              />
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={300} className="h-full">
            <div className="p-6 bg-card/80 backdrop-blur-sm rounded-xl border border-border h-full flex flex-col">
              <h3 className="text-base font-medium text-foreground mb-2">GitHub native</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Works seamlessly with your existing GitHub workflow. No context switching required.
              </p>
              {/* GitHub illustration - hidden on mobile */}
              <img 
                src="/icons/github.svg" 
                alt="GitHub native illustration" 
                className="hidden md:block mt-auto pt-4 h-16 w-auto mx-auto opacity-80"
              />
            </div>
          </AnimateOnScroll>
        </div>

        {/* Bottom row */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <AnimateOnScroll delay={400}>
            <div className="p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
              <h3 className="text-sm font-medium text-foreground mb-1.5">Multi-chain</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pay with USDC on Base or MUSD on Mezo.
              </p>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll delay={500}>
            <div className="p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
              <h3 className="text-sm font-medium text-foreground mb-1.5">Refund protection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full refunds if work is not completed by deadline.
              </p>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll delay={600}>
            <div className="p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
              <h3 className="text-sm font-medium text-foreground mb-1.5">Transparent</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Real-time visibility into all bounty activity.
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}

// Demo bounties for the landing page - always shown regardless of environment
const DEMO_BOUNTIES = [
  {
    id: 'demo-1',
    repoFullName: 'facebook/react',
    issueNumber: 28145,
    issueTitle: 'Optimize React Server Components streaming',
    amount: 500,
    tokenSymbol: 'USDC',
    timeLeft: '6d',
  },
  {
    id: 'demo-2',
    repoFullName: 'vercel/next.js',
    issueNumber: 58234,
    issueTitle: 'Add partial prerendering segments support',
    amount: 1000,
    tokenSymbol: 'USDC',
    timeLeft: '12d',
  },
  {
    id: 'demo-3',
    repoFullName: 'ethereum/go-ethereum',
    issueNumber: 29234,
    issueTitle: 'Improve state pruning efficiency',
    amount: 750,
    tokenSymbol: 'USDC',
    timeLeft: '3d',
  },
  {
    id: 'demo-4',
    repoFullName: 'rust-lang/rust',
    issueNumber: 115678,
    issueTitle: 'Incremental compilation for async functions',
    amount: 1500,
    tokenSymbol: 'USDC',
    timeLeft: '9d',
  },
];

// Bounty Feed Section - Always shows demo bounties
function BountyFeedSection() {
  return (
    <section id="bounties" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header - Centered */}
        <AnimateOnScroll>
          <div className="text-center mb-10">
            <h2 className="font-instrument-serif text-4xl md:text-5xl text-foreground mb-4">
              Start earning
            </h2>
            <Link 
              href="/app" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              View all bounties
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </AnimateOnScroll>

        {/* Bounties grid - Always show demo bounties */}
        <div className="grid md:grid-cols-2 gap-5">
          {DEMO_BOUNTIES.map((bounty, index) => (
            <AnimateOnScroll key={bounty.id} delay={100 + index * 100}>
              <div className="group p-6 bg-card/30 backdrop-blur-sm border border-border rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-foreground/5 h-full">
                {/* Top row: repo + amount */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <p className="text-sm text-muted-foreground font-mono">{bounty.repoFullName}</p>
                  <div className="text-right flex-shrink-0 flex items-baseline gap-1.5">
                    <span className="font-instrument-serif text-xl font-semibold text-muted-foreground">{bounty.amount.toLocaleString()}</span>
                    <span className="font-instrument-serif text-xs text-muted-foreground uppercase">{bounty.tokenSymbol}</span>
                  </div>
                </div>

                {/* Title - larger and can wrap */}
                <h3 className="text-xl text-foreground font-medium leading-snug mb-8">
                  {bounty.issueTitle}
                </h3>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {bounty.timeLeft}
                  </div>
                  <a
                    href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group/link"
                  >
                    View issue
                    <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
                  </a>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// FAQ Section - Two column layout
function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'How do I fund a bounty?',
      answer: 'Connect your wallet, select a GitHub issue, set the bounty amount and deadline, then confirm the transaction. Your funds are securely held in escrow until the work is completed.'
    },
    {
      question: 'Which cryptocurrencies are supported?',
      answer: 'We currently support USDC on Base and MUSD on Mezo. More tokens and chains will be added based on community demand.'
    },
    {
      question: 'How do contributors get paid?',
      answer: 'Contributors link their wallet through BountyPay. When their PR is merged and closes a bounty issue, payment is automatically transferred to their linked wallet.'
    },
    {
      question: "What happens if work isn't completed?",
      answer: 'If the bounty deadline passes without a merged PR, sponsors can claim a full refund of their funds from the escrow contract.'
    },
    {
      question: 'Are there any fees?',
      answer: 'BountyPay charges a 1% platform fee when you fund a bounty. The sponsor pays this upfront; contributors receive the full bounty amount.'
    },
  ];

  return (
    <section id="faq" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left column - Header */}
          <AnimateOnScroll>
            <div>
              <h2 className="font-instrument-serif text-4xl md:text-5xl text-foreground leading-tight mb-3">
                Frequently Asked
                <br />
                Questions
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Everything you need to know about BountyPay.
              </p>
            </div>
          </AnimateOnScroll>

          {/* Right column - FAQ items */}
          <AnimateOnScroll delay={150}>
            <div className="space-y-0 divide-y divide-border">
              {faqs.map((faq, index) => (
                <div key={index} className="py-4">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full text-left flex items-start justify-between gap-4"
                  >
                    <span className="text-sm text-foreground font-medium">{faq.question}</span>
                    <svg 
                      className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openIndex === index ? 'max-h-48 mt-2' : 'max-h-0'
                    }`}
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}

// CTA Section - Large serif headline
function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Diagonal stripe background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(
          135deg,
          transparent,
          transparent 10px,
          rgba(0,0,0,0.015) 10px,
          rgba(0,0,0,0.015) 11px
        )`
      }} />
      
      <AnimateOnScroll>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-instrument-serif text-4xl md:text-5xl lg:text-5xl text-foreground mb-5 leading-tight">
            Ready to fund your first
            <br />
            <span className="italic">bounty?</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Join the growing community of sponsors and contributors building the future of open source.
          </p>
          <Link 
            href="/app/attach-bounty" 
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-full transition-all duration-300 hover:opacity-90 hover:shadow-lg"
          >
            Create a bounty
          </Link>
        </div>
      </AnimateOnScroll>
    </section>
  );
}

// Main Landing Page Component
export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      {/* Global warm gradient background for entire page */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-white via-orange-50/40 to-amber-100/30" />
      
      <div className="relative z-10">
        <HeroSection />
        <Separator />
        <HowItWorksSection />
        <Separator />
        <FeaturesSection />
        <Separator />
        <BountyFeedSection />
        <Separator />
        <FAQSection />
        <Separator />
        <CTASection />
      </div>
    </div>
  );
}
