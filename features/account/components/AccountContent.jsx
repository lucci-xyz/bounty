'use client';

import { cn } from '@/shared/lib';
import { SponsoredTab } from '@/features/account/components/tabs/SponsoredTab';
import { EarningsTab } from '@/features/account/components/tabs/EarningsTab';
import { ControlsTab } from '@/features/account/components/tabs/ControlsTab';
import { SettingsTab } from '@/features/account/components/tabs/SettingsTab';
import { AdminTab } from '@/features/account/components/tabs/AdminTab';
import { ChangeWalletModal } from '@/features/account/components/modals/ChangeWalletModal';
import { DeleteWalletModal } from '@/features/account/components/modals/DeleteWalletModal';
import { ManageReposModal } from '@/features/account/components/modals/ManageReposModal';
import { AllowlistModal } from '@/features/account/components/modals/AllowlistModal';
import { useAccountPage } from '@/features/account';
import { useFlag } from '@/shared/providers/FlagProvider';

/**
 * Main component for the user account page.
 * Renders tab navigation, settings, modals, and account data.
 *
 * @param {object} props
 * @param {string} [props.initialTab] - Optional initial tab to show.
 */
export function AccountContent({ initialTab: initialTabOverride } = {}) {
  const allowlistEnabled = useFlag('allowlistFeature', false);

  // Fetch account data and actions from hook
  const {
    githubUser,
    githubUserLoading,
    tabs,
    activeTab,
    setActiveTab,
    isAdmin,
    sponsor,
    earnings,
    profile,
    allowlist,
    repoManager,
    walletManagement,
    beta,
    allowlistModal,
    wallet,
    logout,
    accountActions
  } = useAccountPage({ initialTab: initialTabOverride });

  const sponsorStatus = sponsor.status;
  const earningsStatus = earnings.status;
  const profileStatus = profile.status;

  // Show loading state while GitHub user data is loading
  if (githubUserLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  // If no user loaded, render nothing
  if (!githubUser) {
    return null;
  }

  return (
    <div className="container max-w-5xl px-6 py-10">
      {/* Header with greeting */}
      <div className="mb-2 animate-fade-in-up">
        <p
          role="heading"
          aria-level={1}
          className="mb-2 text-[clamp(20px,2.4vw,24px)] font-medium tracking-[-0.02em] text-foreground"
        >
          Hello @{githubUser.githubUsername}
        </p>
        <p className="text-sm font-light text-muted-foreground">
          Manage your bounties, earnings, and settings
        </p>
      </div>

      {/* Tab navigation */}
      <div className="mb-8 flex gap-2 border-b border-border pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-3 text-sm font-light transition-colors border-b-2 border-transparent',
              activeTab === tab.id ? 'border-b-foreground text-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sponsored tab */}
      {activeTab === 'sponsored' && (
        sponsorStatus === 'error' ? (
          <TabError
            message="Unable to load your sponsored bounties."
            onRetry={accountActions?.refreshSponsor}
          />
        ) : sponsorStatus !== 'ready' ? (
          <TabLoading message="Loading sponsored bounties..." />
        ) : (
          <SponsoredTab
            showEmptyState={sponsor.showEmptyState}
            stats={sponsor.stats}
            sponsoredBounties={sponsor.sponsoredBounties}
            expandedBountyId={sponsor.expandedBountyId}
            handleToggleBounty={sponsor.handleToggleBounty}
            allowlists={allowlist.allowlists}
            allowlistLoading={allowlist.allowlistLoading}
            openAllowlistModal={allowlist.openAllowlistModal}
          />
        )
      )}

      {/* Earnings tab */}
      {activeTab === 'earnings' && (
        earningsStatus === 'error' ? (
          <TabError
            message="Unable to load your earnings."
            onRetry={accountActions?.refreshEarnings}
          />
        ) : earningsStatus !== 'ready' ? (
          <TabLoading message="Loading earnings..." />
        ) : (
          <EarningsTab
            claimedBounties={earnings.claimedBounties}
            totalEarned={earnings.totalEarned}
          />
        )
      )}

      {/* Controls tab */}
      {activeTab === 'controls' && (
        earningsStatus === 'error' ? (
          <TabError
            message="Unable to load control data."
            onRetry={accountActions?.refreshEarnings}
          />
        ) : earningsStatus !== 'ready' ? (
          <TabLoading message="Loading controls..." />
        ) : (
          <ControlsTab
            claimedBounties={earnings.claimedBounties}
            githubUser={githubUser}
            linkedWalletAddress={profile?.data?.wallet?.walletAddress}
          />
        )
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        profileStatus === 'error' ? (
          <TabError
            message="Unable to load your profile."
            onRetry={accountActions?.refreshProfile}
          />
        ) : profileStatus !== 'ready' ? (
          <TabLoading message="Loading profile..." />
        ) : (
          <SettingsTab
            githubUser={githubUser}
            profile={profile.data}
            onManageRepos={repoManager.handleManageRepos}
            openChangeWalletModal={walletManagement.changeModal.open}
            openDeleteWalletModal={walletManagement.deleteModal.open}
            logout={logout}
          />
        )
      )}

      {/* Admin tab (only for admins) */}
      {activeTab === 'admin' && isAdmin && (
        <AdminTab
          betaApplications={beta.applications}
          betaLoading={beta.loading}
          betaError={beta.error}
          handleReview={beta.handleReview}
          betaProcessing={beta.processing}
        />
      )}

      {/* Wallet change modal */}
      <ChangeWalletModal
        changeModal={walletManagement.changeModal}
        isConnected={wallet.isConnected}
        address={wallet.address}
      />
      {/* Wallet delete modal */}
      <DeleteWalletModal deleteModal={walletManagement.deleteModal} />
      {/* Repositories management modal */}
      <ManageReposModal
        show={repoManager.showManageReposModal}
        repositories={repoManager.repositories}
        loading={repoManager.loadingRepos}
        close={repoManager.closeManageReposModal}
        handleInstallApp={repoManager.handleInstallApp}
      />
      {/* Allowlist management modal */}
      {allowlistEnabled && (
        <AllowlistModal
          bounty={allowlistModal.bounty}
          bountyId={allowlistModal.bountyId}
          allowlistModalData={allowlistModal.data}
          allowlistModalLoading={allowlistModal.loading}
          close={allowlistModal.close}
        />
      )}
    </div>
  );
}

function TabLoading({ message }) {
  return (
    <div className="py-16 text-center text-sm font-light text-muted-foreground">
      {message}
    </div>
  );
}

function TabError({ message, onRetry }) {
  return (
    <div className="py-16 text-center text-sm font-light text-destructive flex flex-col items-center gap-3">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-destructive/50 px-4 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
