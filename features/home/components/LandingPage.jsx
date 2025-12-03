'use client';

import { useState } from 'react';
import Link from 'next/link';

// Separator component
function Separator() {
  return <div className="w-full max-w-6xl mx-auto px-6 py-4"><div className="border-t border-border/50" /></div>;
}

// Hero Section - with warm gradient background
function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden pt-[20vh]">
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Main headline - Larger serif */}
        <h1 className="font-instrument-serif text-5xl md:text-6xl lg:text-7xl text-foreground mb-5 leading-[1.1] tracking-tight">
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

      {/* Product mockup - taller with more items */}
      <div className="relative z-10 w-full max-w-5xl mx-auto mt-16 px-6 pb-12">
        <div className="bg-card rounded-xl border border-border shadow-2xl shadow-foreground/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="px-3 py-1 bg-muted rounded-md text-xs text-muted-foreground">bountypay.xyz</div>
            </div>
          </div>
          <div className="p-8 bg-gradient-to-b from-card to-secondary/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-md" />
                <span className="font-medium text-base text-foreground">Active Bounties</span>
              </div>
              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-md">
                5 open
              </div>
            </div>
            <div className="space-y-3">
              {[
                { title: 'Fix authentication flow', amount: '$500', repo: 'acme/auth-lib' },
                { title: 'Add dark mode support', amount: '$250', repo: 'acme/ui-kit' },
                { title: 'Optimize database queries', amount: '$750', repo: 'acme/backend' },
                { title: 'Implement WebSocket notifications', amount: '$1,000', repo: 'acme/realtime' },
                { title: 'Add unit tests for API routes', amount: '$300', repo: 'acme/api' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.repo}</p>
                  </div>
                  <span className="text-base font-semibold text-foreground">{item.amount}</span>
                </div>
              ))}
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
        <div className="text-center mb-12">
          <h2 className="font-instrument-serif text-4xl md:text-5xl text-foreground leading-tight">
            Simple by design
          </h2>
        </div>

        {/* Tab switcher - Completely rounded */}
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

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <p className="text-xs tracking-[0.3em] text-muted-foreground/50 mb-3">
                {step.number}
              </p>
              <h3 className="text-base text-foreground mb-2 font-medium">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
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
        <div className="text-center mb-12">
          <h2 className="font-instrument-serif text-4xl md:text-5xl text-foreground leading-tight mb-3">
            Built for absolute clarity
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Everything you need to fund and earn bounties, with tools that are simple and clear.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Large feature card */}
          <div className="md:row-span-2 p-6 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
            <h3 className="text-base font-medium text-foreground mb-2">Secure escrow</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Your funds are held in audited smart contracts until work is verified and merged.
            </p>
            {/* Visual placeholder */}
            <div className="aspect-square bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg flex items-center justify-center">
              <svg className="w-16 h-16 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          {/* Right column cards */}
          <div className="p-6 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
            <h3 className="text-base font-medium text-foreground mb-2">Automatic payouts</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When a PR merges and closes the bounty issue, payment is automatically transferred to the contributor.
            </p>
          </div>

          <div className="p-6 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
            <h3 className="text-base font-medium text-foreground mb-2">GitHub native</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Works seamlessly with your existing GitHub workflow. No context switching required.
            </p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
            <h3 className="text-sm font-medium text-foreground mb-1.5">Multi-chain</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pay with USDC on Base or MUSD on Mezo.
            </p>
          </div>
          <div className="p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
            <h3 className="text-sm font-medium text-foreground mb-1.5">Refund protection</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Full refunds if work is not completed by deadline.
            </p>
          </div>
          <div className="p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border">
            <h3 className="text-sm font-medium text-foreground mb-1.5">Transparent</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time visibility into all bounty activity.
            </p>
          </div>
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

        {/* Bounties grid - Always show demo bounties */}
        <div className="grid md:grid-cols-2 gap-5">
          {DEMO_BOUNTIES.map((bounty) => (
            <div
              key={bounty.id}
              className="group p-6 bg-card/30 backdrop-blur-sm border border-border rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-foreground/5"
            >
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
      answer: 'BountyPay takes a 1% platform fee on successful bounty completions. There are no fees for posting bounties or if work is not completed.'
    },
  ];

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left column - Header */}
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

          {/* Right column - FAQ items */}
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
