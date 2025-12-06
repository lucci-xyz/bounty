"use client";

import { useState, useMemo, useCallback } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { formatDate, getStatusColor } from '@/lib';
import { useErrorModal } from '@/ui/providers/ErrorModalProvider';
import { StatBlock } from '@/ui/pages/account/StatBlock';
import { LinkFromCatalog } from '@/ui/components/LinkFromCatalog';
import { WalletIcon, CheckIcon } from '@/ui/components/Icons';

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
 * Network fee card with simple one-click withdrawal.
 * Fees are sent to the connected wallet (must be contract owner).
 */
function NetworkFeeCard({ network, onWithdraw, isWithdrawing, withdrawStatus, onClearStatus, wallet, onConnectWallet, showError }) {
  const hasAvailableFees = network.fees && parseFloat(network.fees.availableFormatted) > 0;

  const handleWithdraw = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      onConnectWallet?.();
      return;
    }
    try {
      // Withdraw to connected wallet address
      await onWithdraw(network.alias, wallet.address, '0');
    } catch (err) {
      if (err.message?.includes('owner')) {
        showError({ title: 'Permission Denied', message: err.message });
      }
    }
  }, [wallet.isConnected, wallet.address, network.alias, onWithdraw, onConnectWallet, showError]);

  return (
    <div className="bg-card border border-border/40 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-medium text-foreground">{network.name}</h4>
          <div className="text-xs text-muted-foreground font-mono">
            {network.escrowAddress.slice(0, 10)}...{network.escrowAddress.slice(-8)}
          </div>
        </div>
        <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {network.token.symbol}
        </span>
      </div>

      {network.error ? (
        <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">Error: {network.error}</div>
      ) : network.fees ? (
        <div className="space-y-4">
          {/* Fee amounts */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Available to withdraw</div>
              <div className="text-2xl font-semibold text-foreground">
                {parseFloat(network.fees.availableFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-normal text-muted-foreground ml-1">{network.token.symbol}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">All-time</div>
              <div className="text-sm text-muted-foreground">
                {parseFloat(network.fees.totalAccruedFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Status message */}
          {withdrawStatus && (
            <StatusMessage status={withdrawStatus} onDismiss={() => onClearStatus?.(network.alias)} />
          )}

          {/* Withdraw button */}
          {hasAvailableFees ? (
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isWithdrawing ? (
                'Processing...'
              ) : !wallet.isConnected ? (
                <>
                  <WalletIcon size={16} />
                  Connect to Withdraw
                </>
              ) : (
                `Withdraw to ${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`
              )}
            </button>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-2">No fees available</div>
          )}

          {/* Fee rate info */}
          <div className="text-xs text-muted-foreground text-center">
            Fee rate: {(network.fees.feeBps / 100).toFixed(2)}%
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
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
          <StatBlock label="Applications" value={betaLoading ? '...' : betaApplications?.length || 0} showIcon={false} />
          <StatBlock label="Pending" value={betaLoading ? '...' : pendingApps.length} valueClassName={pendingApps.length > 0 ? 'text-amber-500' : ''} showIcon={false} />
          <StatBlock label="Beta Users" value={betaLoading ? '...' : approvedApps.length} valueClassName="text-primary" showIcon={false} />
          <StatBlock label="Rejected" value={betaLoading ? '...' : rejectedApps.length} showIcon={false} />
          <StatBlock label="Networks" value={feesLoading ? '...' : networks.length} showIcon={false} />
          <StatBlock label="Fees Available" value={feesLoading ? '...' : totals.networksWithFees || 0} hint={!feesLoading ? `${totals.totalAvailable?.toFixed(2) || '0.00'} total` : ''} showIcon={false} />
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
            <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5">
              <CheckIcon size={12} />
              <span className="font-mono">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
            </div>
          ) : (
            <button onClick={handleConnectWallet} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 hover:bg-muted rounded-full px-3 py-1.5 transition-colors">
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
