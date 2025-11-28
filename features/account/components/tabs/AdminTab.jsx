"use client";

import { useState, useMemo, useCallback } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { formatDate, getStatusColor } from '@/shared/lib';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';
import { StatBlock } from '@/features/account/components/StatBlock';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';
import { WalletIcon } from '@/shared/components/Icons';

/**
 * Status message component for inline feedback
 */
function StatusMessage({ status, onDismiss }) {
  if (!status) return null;
  const colors = {
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
    success: 'bg-primary/10 border-primary/30 text-primary',
    loading: 'bg-muted/50 border-border text-muted-foreground'
  };
  return (
    <div className={`text-xs rounded p-2 border ${colors[status.type] || colors.loading} flex items-center justify-between gap-2`}>
      <span>{status.message}</span>
      {(status.type === 'error' || status.type === 'success') && onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100">✕</button>
      )}
    </div>
  );
}

/**
 * Application card for beta access management
 */
function ApplicationCard({ app, onApprove, onReject, isProcessing, showActions }) {
  return (
    <div className="bg-card border border-border/40 rounded-xl p-4 flex justify-between items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <LinkFromCatalog
            section="github"
            link="userProfile"
            params={{ username: app.githubUsername }}
            className="text-primary hover:underline truncate text-sm font-medium"
          >
            @{app.githubUsername}
          </LinkFromCatalog>
          <span
            className="bounty-tag shrink-0 text-[10px] px-2 py-0.5"
            style={{ background: `${getStatusColor(app.status)}15`, color: getStatusColor(app.status) }}
          >
            {app.status}
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {app.status === 'pending' ? 'Applied' : app.status === 'approved' ? 'Approved' : 'Rejected'}: {formatDate(app.appliedAt)}
        </div>
        {app.email && <div className="text-muted-foreground text-xs mt-0.5 truncate">{app.email}</div>}
      </div>
      {showActions && (
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onApprove?.(app.id)} disabled={isProcessing} className="premium-btn bg-primary text-primary-foreground text-xs px-3 py-1.5">
            ✓ Approve
          </button>
          <button onClick={() => onReject?.(app.id)} disabled={isProcessing} className="premium-btn bg-transparent border border-border text-muted-foreground text-xs px-3 py-1.5">
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Network fee card with wallet-based withdrawal
 */
function NetworkFeeCard({ network, onWithdraw, isWithdrawing, withdrawStatus, onClearStatus, wallet, onConnectWallet, showError }) {
  const [treasury, setTreasury] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [localError, setLocalError] = useState(null);

  const hasAvailableFees = network.fees && parseFloat(network.fees.availableFormatted) > 0;

  const handleWithdraw = useCallback(async () => {
    if (!treasury.trim()) { setLocalError('Treasury address required'); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(treasury)) { setLocalError('Invalid address format'); return; }
    setLocalError(null);
    try {
      await onWithdraw(network.alias, treasury.trim(), '0');
      setShowWithdrawForm(false);
      setTreasury('');
    } catch (err) {
      // Critical errors shown in modal, inline errors handled by status
      if (err.message?.includes('owner')) {
        showError({ title: 'Permission Denied', message: err.message });
      }
    }
  }, [treasury, network.alias, onWithdraw, showError]);

  const handleCancel = () => { setShowWithdrawForm(false); setLocalError(null); onClearStatus?.(network.alias); };
  const handleStartWithdraw = () => wallet.isConnected ? setShowWithdrawForm(true) : onConnectWallet?.();

  return (
    <div className="bg-card border border-border/40 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">{network.name}</h4>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {network.escrowAddress.slice(0, 8)}...{network.escrowAddress.slice(-6)}
          </div>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{network.token.symbol}</span>
      </div>

      {network.error ? (
        <div className="text-xs text-destructive bg-destructive/10 rounded p-2">Error: {network.error}</div>
      ) : network.fees ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Available</div>
              <div className="text-lg font-semibold text-foreground">
                {parseFloat(network.fees.availableFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Total Accrued</div>
              <div className="text-lg font-semibold text-muted-foreground">
                {parseFloat(network.fees.totalAccruedFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-3">Fee rate: {(network.fees.feeBps / 100).toFixed(2)}%</div>

          {withdrawStatus && <div className="mb-3"><StatusMessage status={withdrawStatus} onDismiss={() => onClearStatus?.(network.alias)} /></div>}

          {hasAvailableFees && !showWithdrawForm && (
            <button onClick={handleStartWithdraw} disabled={isWithdrawing} className="premium-btn w-full text-xs bg-primary text-primary-foreground py-2 flex items-center justify-center gap-2">
              {!wallet.isConnected && <WalletIcon size={14} />}
              {wallet.isConnected ? 'Withdraw Fees' : 'Connect Wallet'}
            </button>
          )}

          {showWithdrawForm && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded p-2">
                <WalletIcon size={14} className="text-primary" />
                <span className="font-mono text-foreground">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Treasury Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={treasury}
                    onChange={e => setTreasury(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={() => setTreasury(wallet.address || '')} className="premium-btn text-xs bg-transparent border border-border text-muted-foreground py-2 px-3">
                    Use Mine
                  </button>
                </div>
              </div>
              {localError && <div className="text-xs text-destructive">{localError}</div>}
              <div className="text-xs text-amber-500/80 bg-amber-500/10 rounded p-2">
                ⚠️ Connected wallet must be the contract owner.
              </div>
              <div className="flex gap-2">
                <button onClick={handleWithdraw} disabled={isWithdrawing} className="premium-btn flex-1 text-xs bg-primary text-primary-foreground py-2 disabled:opacity-50">
                  {isWithdrawing ? 'Processing...' : 'Confirm Withdraw'}
                </button>
                <button onClick={handleCancel} disabled={isWithdrawing} className="premium-btn text-xs bg-transparent border border-border text-muted-foreground py-2 px-3">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!hasAvailableFees && <div className="text-xs text-muted-foreground text-center py-2">No fees available</div>}
        </>
      ) : (
        <div className="text-xs text-muted-foreground">Loading...</div>
      )}
    </div>
  );
}

/**
 * Collapsible section for organizing content
 */
function CollapsibleSection({ title, count, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between text-left mb-3 group">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          {title}
          {count !== undefined && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{count}</span>}
        </h3>
        <span className="text-muted-foreground text-xs group-hover:text-foreground">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && children}
    </div>
  );
}

/**
 * AdminTab - Admin dashboard for managing beta applications and protocol fees.
 * Only renders for authenticated admin users. Server-side API routes enforce admin checks.
 */
export function AdminTab({ betaApplications, betaLoading, betaError, handleReview, betaProcessing, networkFees = {} }) {
  const { openConnectModal } = useConnectModal();
  const { showError } = useErrorModal();

  const { networks = [], loading: feesLoading, error: feesError, withdrawing = {}, withdrawStatus = {}, totals = {}, wallet = {}, withdraw, clearStatus } = networkFees;

  // Filter applications by status
  const pendingApps = useMemo(() => betaApplications?.filter(a => a.status === 'pending') || [], [betaApplications]);
  const approvedApps = useMemo(() => betaApplications?.filter(a => a.status === 'approved') || [], [betaApplications]);
  const rejectedApps = useMemo(() => betaApplications?.filter(a => a.status === 'rejected') || [], [betaApplications]);

  const onApprove = id => handleReview(id, 'approve');
  const onReject = id => handleReview(id, 'reject');
  const handleConnectWallet = () => openConnectModal?.();

  // Show critical errors in modal
  if (betaError && !betaApplications?.length) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {betaError}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatBlock label="Applications" value={betaLoading ? '...' : betaApplications?.length || 0} />
          <StatBlock label="Pending" value={betaLoading ? '...' : pendingApps.length} valueClassName={pendingApps.length > 0 ? 'text-amber-500' : ''} />
          <StatBlock label="Beta Users" value={betaLoading ? '...' : approvedApps.length} valueClassName="text-primary" />
          <StatBlock label="Rejected" value={betaLoading ? '...' : rejectedApps.length} />
          <StatBlock label="Networks" value={feesLoading ? '...' : networks.length} />
          <StatBlock label="Fees Available" value={feesLoading ? '...' : totals.networksWithFees || 0} hint={!feesLoading ? `${totals.totalAvailable?.toFixed(2) || '0.00'} total` : ''} />
        </div>
      </section>

      {/* Beta Applications */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Beta Applications</h2>
        {betaLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {pendingApps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-amber-500 mb-3 flex items-center gap-2">
                  Pending Review <span className="bg-amber-500/20 text-xs px-2 py-0.5 rounded">{pendingApps.length}</span>
                </h3>
                <div className="space-y-2">
                  {pendingApps.map(app => (
                    <ApplicationCard key={app.id} app={app} onApprove={onApprove} onReject={onReject} isProcessing={betaProcessing?.[app.id]} showActions />
                  ))}
                </div>
              </div>
            )}
            {approvedApps.length > 0 && (
              <CollapsibleSection title="Beta Users" count={approvedApps.length} defaultOpen={!pendingApps.length}>
                <div className="space-y-2">{approvedApps.map(app => <ApplicationCard key={app.id} app={app} />)}</div>
              </CollapsibleSection>
            )}
            {rejectedApps.length > 0 && (
              <CollapsibleSection title="Rejected" count={rejectedApps.length}>
                <div className="space-y-2">{rejectedApps.map(app => <ApplicationCard key={app.id} app={app} />)}</div>
              </CollapsibleSection>
            )}
            {!betaApplications?.length && (
              <div className="py-8 text-center text-sm text-muted-foreground bg-card border border-border/40 rounded-xl">No applications</div>
            )}
          </>
        )}
      </section>

      {/* Protocol Fees */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">Protocol Fees</h2>
          {wallet.isConnected ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-mono">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
            </div>
          ) : (
            <button onClick={handleConnectWallet} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-lg px-3 py-2">
              <WalletIcon size={14} />
              <span>Connect wallet</span>
            </button>
          )}
        </div>
        {feesError && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{feesError}</div>}
        {feesLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : networks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {networks.map(network => (
              <NetworkFeeCard
                key={network.alias}
                network={network}
                onWithdraw={withdraw}
                isWithdrawing={withdrawing[network.alias]}
                withdrawStatus={withdrawStatus[network.alias]}
                onClearStatus={clearStatus}
                wallet={wallet}
                onConnectWallet={handleConnectWallet}
                showError={showError}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground bg-card border border-border/40 rounded-xl">No networks configured</div>
        )}
      </section>
    </div>
  );
}
