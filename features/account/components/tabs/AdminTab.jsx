"use client";

import { useState, useMemo } from 'react';
import { formatDate, getStatusColor } from '@/shared/lib';
import { StatBlock } from '@/features/account/components/StatBlock';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';

/**
 * ApplicationCard - Reusable card for displaying a beta application
 */
function ApplicationCard({ app, onApprove, onReject, isProcessing, showActions = false }) {
  return (
    <div className="bg-card border border-border/40 rounded-xl p-4 flex justify-between items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <LinkFromCatalog
            section="github"
            link="userProfile"
            params={{ username: app.githubUsername }}
            className="text-primary hover:underline truncate"
            style={{ fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
          >
            @{app.githubUsername}
          </LinkFromCatalog>
          <span
            className="bounty-tag shrink-0"
            style={{
              background: `${getStatusColor(app.status)}15`,
              color: getStatusColor(app.status),
              fontSize: '10px',
              padding: '2px 8px'
            }}
          >
            {app.status}
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {app.status === 'pending' ? 'Applied' : app.status === 'approved' ? 'Approved' : 'Rejected'}: {formatDate(app.appliedAt)}
        </div>
        {app.email && (
          <div className="text-muted-foreground text-xs mt-0.5 truncate">
            {app.email}
          </div>
        )}
      </div>
      {showActions && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onApprove?.(app.id)}
            disabled={isProcessing}
            className="premium-btn bg-primary text-primary-foreground text-xs px-3 py-1.5"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => onReject?.(app.id)}
            disabled={isProcessing}
            className="premium-btn bg-transparent border border-border text-muted-foreground text-xs px-3 py-1.5"
          >
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * NetworkFeeCard - Display fees for a single network with withdraw action
 */
function NetworkFeeCard({ network, onWithdraw, isWithdrawing }) {
  const [treasury, setTreasury] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);

  const hasAvailableFees = network.fees && parseFloat(network.fees.availableFormatted) > 0;

  const handleWithdraw = async () => {
    if (!treasury.trim()) {
      setWithdrawError('Treasury address is required');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(treasury)) {
      setWithdrawError('Invalid Ethereum address');
      return;
    }
    
    setWithdrawError(null);
    setWithdrawSuccess(null);
    
    try {
      const result = await onWithdraw(network.alias, treasury.trim(), '0');
      setWithdrawSuccess(`Withdrawn ${result.formattedAmount} ${network.token.symbol}. Tx: ${result.txHash.slice(0, 10)}...`);
      setShowWithdraw(false);
      setTreasury('');
    } catch (err) {
      setWithdrawError(err.message || 'Withdrawal failed');
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">{network.name}</h4>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {network.escrowAddress.slice(0, 8)}...{network.escrowAddress.slice(-6)}
          </div>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
          {network.token.symbol}
        </span>
      </div>

      {network.error ? (
        <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
          Failed to load: {network.error}
        </div>
      ) : network.fees ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Available</div>
              <div className="text-lg font-semibold text-foreground">
                {parseFloat(network.fees.availableFormatted).toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: network.token.decimals === 18 ? 4 : 2 
                })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Total Accrued</div>
              <div className="text-lg font-semibold text-muted-foreground">
                {parseFloat(network.fees.totalAccruedFormatted).toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: network.token.decimals === 18 ? 4 : 2 
                })}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground mb-3">
            Fee rate: {(network.fees.feeBps / 100).toFixed(2)}%
          </div>

          {withdrawSuccess && (
            <div className="text-xs text-primary bg-primary/10 rounded p-2 mb-3">
              {withdrawSuccess}
            </div>
          )}

          {hasAvailableFees && !showWithdraw && (
            <button
              onClick={() => setShowWithdraw(true)}
              className="premium-btn w-full text-xs bg-primary text-primary-foreground py-2"
            >
              Withdraw Fees
            </button>
          )}

          {showWithdraw && (
            <div className="space-y-2">
              <input
                type="text"
                value={treasury}
                onChange={(e) => setTreasury(e.target.value)}
                placeholder="Treasury address (0x...)"
                className="w-full text-xs bg-background border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {withdrawError && (
                <div className="text-xs text-destructive">{withdrawError}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="premium-btn flex-1 text-xs bg-primary text-primary-foreground py-2 disabled:opacity-50"
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdraw All'}
                </button>
                <button
                  onClick={() => { setShowWithdraw(false); setWithdrawError(null); }}
                  className="premium-btn text-xs bg-transparent border border-border text-muted-foreground py-2 px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!hasAvailableFees && (
            <div className="text-xs text-muted-foreground text-center py-2">
              No fees available to withdraw
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-muted-foreground">Loading...</div>
      )}
    </div>
  );
}

/**
 * CollapsibleSection - Expandable section for grouping content
 */
function CollapsibleSection({ title, count, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left mb-3 group"
      >
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              {count}
            </span>
          )}
        </h3>
        <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors">
          {isOpen ? '▼' : '▶'}
        </span>
      </button>
      {isOpen && children}
    </div>
  );
}

/**
 * AdminTab displays and manages beta applications and network fees for admin users.
 *
 * Props:
 * - betaApplications: Array of application objects
 * - betaLoading: Boolean, true if loading
 * - betaError: String, error message if loading failed
 * - handleReview: Function to approve/reject applications
 * - betaProcessing: Object with loading state per application ID
 * - networkFees: Object from useNetworkFees hook
 */
export function AdminTab({ 
  betaApplications, 
  betaLoading, 
  betaError, 
  handleReview, 
  betaProcessing,
  networkFees = {}
}) {
  const {
    networks = [],
    loading: feesLoading,
    error: feesError,
    withdrawing = {},
    totals = {},
    withdraw
  } = networkFees;

  // Split applications by status
  const pendingApps = useMemo(
    () => betaApplications?.filter(app => app.status === 'pending') || [],
    [betaApplications]
  );
  const approvedApps = useMemo(
    () => betaApplications?.filter(app => app.status === 'approved') || [],
    [betaApplications]
  );
  const rejectedApps = useMemo(
    () => betaApplications?.filter(app => app.status === 'rejected') || [],
    [betaApplications]
  );

  // Handle application review
  const onApprove = (id) => handleReview(id, 'approve');
  const onReject = (id) => handleReview(id, 'reject');

  // Show global error if present
  if (betaError && !betaApplications?.length) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {betaError}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ===== STATS OVERVIEW ===== */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatBlock 
            className="animate-fade-in-up" 
            label="Total Applications" 
            value={betaLoading ? '...' : betaApplications?.length || 0} 
          />
          <StatBlock
            className="animate-fade-in-up delay-100"
            label="Pending"
            value={betaLoading ? '...' : pendingApps.length}
            valueClassName={pendingApps.length > 0 ? 'text-amber-500' : ''}
          />
        <StatBlock
          className="animate-fade-in-up delay-200"
            label="Beta Users"
            value={betaLoading ? '...' : approvedApps.length}
            valueClassName="text-primary"
        />
        <StatBlock
          className="animate-fade-in-up delay-300"
            label="Rejected"
            value={betaLoading ? '...' : rejectedApps.length}
        />
        <StatBlock
          className="animate-fade-in-up delay-400"
            label="Networks"
            value={feesLoading ? '...' : networks.length}
          />
          <StatBlock
            className="animate-fade-in-up delay-500"
            label="Fees Available"
            value={feesLoading ? '...' : totals.networksWithFees || 0}
            hint={feesLoading ? '' : `${totals.totalAvailable?.toFixed(2) || '0.00'} total`}
        />
      </div>
      </section>

      {/* ===== BETA APPLICATIONS ===== */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Beta Applications</h2>
        
        {betaLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading applications...
          </div>
        ) : (
          <>
            {/* Pending Applications - Always visible if present */}
            {pendingApps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-amber-500 mb-3 flex items-center gap-2">
                  Pending Review
                  <span className="bg-amber-500/20 text-amber-500 text-xs px-2 py-0.5 rounded">
                    {pendingApps.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {pendingApps.map(app => (
                    <ApplicationCard
                  key={app.id}
                      app={app}
                      onApprove={onApprove}
                      onReject={onReject}
                      isProcessing={betaProcessing?.[app.id]}
                      showActions
                    />
                  ))}
                    </div>
                      </div>
                    )}

            {/* Approved Users - Collapsible */}
            {approvedApps.length > 0 && (
              <CollapsibleSection title="Beta Users" count={approvedApps.length} defaultOpen={pendingApps.length === 0}>
                <div className="space-y-2">
                  {approvedApps.map(app => (
                    <ApplicationCard key={app.id} app={app} />
                  ))}
                  </div>
              </CollapsibleSection>
            )}

            {/* Rejected Applications - Collapsible */}
            {rejectedApps.length > 0 && (
              <CollapsibleSection title="Rejected Applications" count={rejectedApps.length}>
                <div className="space-y-2">
                  {rejectedApps.map(app => (
                    <ApplicationCard key={app.id} app={app} />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Empty state */}
            {!betaApplications?.length && (
              <div className="py-8 text-center text-sm text-muted-foreground bg-card border border-border/40 rounded-xl">
                No beta applications yet
              </div>
            )}
          </>
        )}
      </section>

      {/* ===== NETWORK FEES ===== */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Protocol Fees</h2>
        
        {feesError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {feesError}
          </div>
        )}

        {feesLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading network fees...
          </div>
        ) : networks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {networks.map(network => (
              <NetworkFeeCard
                key={network.alias}
                network={network}
                onWithdraw={withdraw}
                isWithdrawing={withdrawing[network.alias]}
              />
              ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground bg-card border border-border/40 rounded-xl">
            No networks configured
        </div>
      )}
      </section>
    </div>
  );
}
