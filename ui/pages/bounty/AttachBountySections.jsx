import { MoneyIcon, GitHubIcon } from '@/ui/components/Icons';
import { LinkFromCatalog } from '@/ui/components/LinkFromCatalog';

/**
 * Loading state shown while the bounty flow is being prepared.
 */
export function AttachBountyLoadingState() {
  return (
    <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[32px] border border-border/60 bg-card p-10 text-center shadow-[0_40px_120px_rgba(15,23,42,0.12)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MoneyIcon size={24} color="currentColor" />
        </div>
        <p className="text-sm text-muted-foreground">Preparing bounty flow...</p>
      </div>
    </div>
  );
}

/**
 * Section for direct setup when user needs to install the GitHub App.
 *
 * @param {Object} props
 * @param {Function} props.onBack - Triggered when the back button is clicked.
 */
export function DirectSetupSection({ onBack }) {
  return (
    <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-[36px] border border-border/60 bg-card p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-light text-foreground/90">Create Bounty</h1>
          <p className="text-sm text-muted-foreground">
            Install the Lucci GitHub App to start funding issues directly from GitHub.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-foreground">Install GitHub App</h3>
            <p className="text-sm text-muted-foreground">
              Add BountyPay to your repo, then trigger the “Attach Bounty” action from any issue.
            </p>
          </div>
          <LinkFromCatalog
            section="github"
            link="appListing"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <GitHubIcon size={18} color="white" />
            <span className="text-white">Install GitHub App</span>
          </LinkFromCatalog>
        </div>

        <div className="rounded-3xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
          Once installed, open any issue and hit “Attach Bounty” to land back on this page with the issue pre-filled.
        </div>
      </div>
    </div>
  );
}

/**
 * Shows a summary of the selected GitHub issue.
 *
 * @param {Object} props
 * @param {string} props.repoFullName - Full repository name (e.g. "user/repo").
 * @param {number|string} props.issueNumber - GitHub issue number.
 */
export function IssueSummaryCard({ repoFullName, issueNumber }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
      <div className="flex flex-col gap-2 text-left">
        <div className="flex items-center justify-between text-foreground">
          <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">Repository</span>
          <span className="font-medium">{repoFullName}</span>
        </div>
        <div className="flex items-center justify-between text-foreground">
          <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">Issue</span>
          <span className="font-medium">#{issueNumber}</span>
        </div>
        <LinkFromCatalog
          section="github"
          link="issue"
          params={{ repoFullName, issueNumber }}
          className="text-sm text-primary hover:opacity-80"
        >
          View on GitHub →
        </LinkFromCatalog>
      </div>
    </div>
  );
}

/**
 * Shows a summary of the connected wallet and network.
 *
 * @param {Object} props
 * @param {Object} props.wallet - Wallet information (should include address, chain).
 * @param {Object} props.network - Network information (should include name, token).
 */
export function WalletSummaryCard({ wallet, network }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
      <div className="flex items-center justify-between text-foreground">
        <span>Connected</span>
        <span className="font-medium">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
      </div>
      <div className="flex items-center justify-between text-foreground mt-2">
        <span>Network</span>
        <span className="font-medium">{wallet.chain?.name || network?.name}</span>
      </div>
    </div>
  );
}

/**
 * Banner warning when the connected network is not supported.
 *
 * @param {Object} props
 * @param {boolean} props.isChainSupported - If true, network is supported.
 * @param {Object} props.chain - Chain information (should include id, name).
 * @param {string} props.networkGroup - "mainnet" or "testnet".
 * @param {string[]} props.supportedNetworkNames - List of supported network names.
 */
export function NetworkWarningBanner({ isChainSupported, chain, networkGroup, supportedNetworkNames }) {
  if (isChainSupported) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Connected network ({chain?.name || `Chain ID ${chain?.id}`}) isn’t supported while {networkGroup === 'mainnet' ? 'mainnet' : 'testnet'} mode is active.
      Supported networks: {supportedNetworkNames.length ? supportedNetworkNames.join(', ') : 'None'}.
    </div>
  );
}

