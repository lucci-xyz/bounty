import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="container">
      <h1>💰 BountyPay</h1>
      <p className="subtitle">Automated bounty payments for open-source contributors</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        margin: '40px 0',
        textAlign: 'left'
      }}>
        <div style={{
          background: '#f7fafc',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '16px', color: '#2d3748', marginBottom: '8px' }}>🎯 For Sponsors</h3>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>
            Attach USDC bounties to GitHub issues. Funds are held safely in escrow until work is complete.
          </p>
        </div>

        <div style={{
          background: '#f7fafc',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '16px', color: '#2d3748', marginBottom: '8px' }}>👨‍💻 For Contributors</h3>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>
            Solve issues and get paid automatically when your PR is merged. No manual invoicing needed.
          </p>
        </div>

        <div style={{
          background: '#f7fafc',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '16px', color: '#2d3748', marginBottom: '8px' }}>⚡ Automated</h3>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>
            Smart contracts handle payments automatically via GitHub webhooks. Fast and trustless.
          </p>
        </div>

        <div style={{
          background: '#f7fafc',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '16px', color: '#2d3748', marginBottom: '8px' }}>🔒 Secure</h3>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>
            Built on Base with audited OpenZeppelin contracts. Your funds are always safe.
          </p>
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: '20px', color: '#2d3748' }}>Get Started</h2>
        <a href="https://github.com/apps/bountypay" className="btn btn-primary">
          Install GitHub App
        </a>
        <Link to="/link-wallet" className="btn btn-secondary">
          Link Your Wallet
        </Link>
      </div>

      <div style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0',
        color: '#718096',
        fontSize: '14px'
      }}>
        <p>Built on Base Sepolia • Powered by USDC</p>
        <p style={{ marginTop: '10px' }}>
          <a href="https://github.com/your-org/bounty" target="_blank" rel="noopener noreferrer">GitHub</a> •{' '}
          <a href="https://sepolia.basescan.org/address/0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD" target="_blank" rel="noopener noreferrer">
            Contract
          </a> •{' '}
          <a href="https://docs.base.org" target="_blank" rel="noopener noreferrer">Docs</a>
        </p>
      </div>
    </div>
  );
}

export default Home;

