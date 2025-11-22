'use client';

import { cn } from '@/shared/lib';
import { SponsoredTab } from '@/features/account/components/tabs/SponsoredTab';
import { EarningsTab } from '@/features/account/components/tabs/EarningsTab';
import { SettingsTab } from '@/features/account/components/tabs/SettingsTab';
import { AdminTab } from '@/features/account/components/tabs/AdminTab';
import { ChangeWalletModal } from '@/features/account/components/modals/ChangeWalletModal';
import { DeleteWalletModal } from '@/features/account/components/modals/DeleteWalletModal';
import { ManageReposModal } from '@/features/account/components/modals/ManageReposModal';
import { AllowlistModal } from '@/features/account/components/modals/AllowlistModal';
import { useAccountPage } from '@/features/account';

/**
 * Main component for the user account page.
 * Renders tab navigation, settings, modals, and account data.
 *
 * @param {object} props
 * @param {string} [props.initialTab] - Optional initial tab to show.
 */
export function AccountContent({ initialTab: initialTabOverride } = {}) {
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
    allowlist,
    repoManager,
    walletManagement,
    beta,
    allowlistModal,
    wallet,
    logout
  } = useAccountPage({ initialTab: initialTabOverride });

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
        <SponsoredTab
          showEmptyState={sponsor.showEmptyState}
          stats={sponsor.stats}
          hasWallet={sponsor.hasWallet}
          displayBounties={sponsor.displayBounties}
          totalPages={sponsor.totalPages}
          currentPage={sponsor.currentPage}
          handlePrevPage={sponsor.handlePrevPage}
          handleNextPage={sponsor.handleNextPage}
          expandedBountyId={sponsor.expandedBountyId}
          handleToggleBounty={sponsor.handleToggleBounty}
          allowlists={allowlist.allowlists}
          allowlistLoading={allowlist.allowlistLoading}
          openAllowlistModal={allowlist.openAllowlistModal}
        />
      )}

      {/* Earnings tab */}
      {activeTab === 'earnings' && (
        <EarningsTab
          claimedBounties={earnings.claimedBounties}
          totalEarned={earnings.totalEarned}
        />
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <SettingsTab
          githubUser={githubUser}
          profile={earnings.profile}
          onManageRepos={repoManager.handleManageRepos}
          openChangeWalletModal={walletManagement.changeModal.open}
          openDeleteWalletModal={walletManagement.deleteModal.open}
          logout={logout}
        />
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
      <AllowlistModal
        bounty={allowlistModal.bounty}
        bountyId={allowlistModal.bountyId}
        allowlistModalData={allowlistModal.data}
        allowlistModalLoading={allowlistModal.loading}
        close={allowlistModal.close}
      />
    </div>
  );
}
