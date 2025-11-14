import Link from 'next/link';
import { TargetIcon, CodeIcon, LightningIcon, ShieldIcon, GitHubIcon, WalletIcon } from '@/components/Icons';

export default function AboutPage() {
  return (
    <div className="container" style={{ maxWidth: '1100px', textAlign: 'center' }}>
      <div style={{ marginBottom: '80px' }}>
        <h1 style={{ fontSize: '56px', lineHeight: '1.1' }}>
          Automated Bounty Payments<br />for Open Source
        </h1>
        <p className="subtitle" style={{ fontSize: '20px', maxWidth: '600px', margin: '0 auto 48px' }}>
          Fund GitHub issues with crypto. Contributors get paid automatically when PRs merge.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://github.com/apps/bountypay" className="btn btn-primary" style={{ fontSize: '18px', padding: '16px 32px' }}>
            <GitHubIcon size={20} color="white" />
            Install GitHub App
          </a>
          <Link href="/" className="btn btn-secondary" style={{ fontSize: '18px', padding: '16px 32px' }}>
            <TargetIcon size={20} />
            View Open Bounties
          </Link>
          <Link href="/link-wallet" className="btn btn-secondary" style={{ fontSize: '18px', padding: '16px 32px' }}>
            <WalletIcon size={20} />
            Link Your Wallet
          </Link>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        margin: '80px 0',
        textAlign: 'left'
      }}>
        <div className="card">
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(131, 238, 232, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <TargetIcon size={24} color="var(--color-primary)" />
          </div>
          <h3>For Sponsors</h3>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
            Attach crypto bounties to GitHub issues. Funds held safely in escrow until work is complete.
          </p>
        </div>

        <div className="card">
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(131, 238, 232, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <CodeIcon size={24} color="var(--color-primary)" />
          </div>
          <h3>For Contributors</h3>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
            Solve issues and get paid automatically when your PR merges. No invoicing required.
          </p>
        </div>

        <div className="card">
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(131, 238, 232, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <LightningIcon size={24} color="var(--color-primary)" />
          </div>
          <h3>Automated</h3>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
            Smart contracts handle payments automatically via GitHub webhooks. Fast and trustless.
          </p>
        </div>

        <div className="card">
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(131, 238, 232, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <ShieldIcon size={24} color="var(--color-primary)" />
          </div>
          <h3>Secure</h3>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
            Built on Base with audited OpenZeppelin contracts. Your funds are always protected.
          </p>
        </div>
      </div>

      <div style={{
        marginTop: '80px',
        paddingTop: '40px',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        fontSize: '14px'
      }}>
        <p style={{ marginBottom: '12px' }}>Built on Base Sepolia • Powered by USDC & MUSD</p>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://github.com/your-org/bounty" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://sepolia.basescan.org/address/0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD" target="_blank" rel="noopener noreferrer">
            Contract
          </a>
          <a href="https://docs.base.org" target="_blank" rel="noopener noreferrer">Docs</a>
        </div>
      </div>
    </div>
  );
}

