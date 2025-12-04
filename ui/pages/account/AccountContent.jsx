'use client';
import { cn } from '@/lib';
import Link from 'next/link';
import { SponsoredTab } from '@/ui/pages/account/tabs/SponsoredTab';
import { EarningsTab } from '@/ui/pages/account/tabs/EarningsTab';
import { ControlsTab } from '@/ui/pages/account/tabs/ControlsTab';
import { SettingsTab } from '@/ui/pages/account/tabs/SettingsTab';
import { AdminTab } from '@/ui/pages/account/tabs/AdminTab';
import { ChangeWalletModal } from '@/ui/pages/account/modals/ChangeWalletModal';
import { DeleteWalletModal } from '@/ui/pages/account/modals/DeleteWalletModal';
import { ManageReposModal } from '@/ui/pages/account/modals/ManageReposModal';
import { AllowlistModal } from '@/ui/pages/account/modals/AllowlistModal';
import { useAccountPage } from '@/ui/hooks/useAccountPage';
import { useFlag } from '@/ui/providers/FlagProvider';
import UserAvatar from '@/ui/components/UserAvatar';
import { 
  BountyIcon, 
  WalletOutlineIcon as WalletIcon, 
  ControlsIcon, 
  SettingsIcon, 
  AdminIcon, 
  PlusIcon 
} from '@/ui/components/Icons';

/**
 * Main component for the user account page.
 * Renders sidebar navigation, settings, modals, and account data.
 * Responsive: Shows sidebar on desktop, horizontal tabs on mobile.
 */
export function AccountContent({ initialTab: initialTabOverride } = {}) {
  const allowlistEnabled = useFlag('allowlistFeature', false);

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
    networkFees,
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            <span className="text-sm">Loading your account...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!githubUser) {
    return null;
  }

  // Navigation items
  const navItems = [
    { id: 'sponsored', label: 'Bounties', icon: BountyIcon },
    { id: 'earnings', label: 'Earnings', icon: WalletIcon },
    { id: 'controls', label: 'Controls', icon: ControlsIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: AdminIcon }] : []),
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Mobile Header */}
      <div className="lg:hidden mb-4">
        {/* User Info + Menu Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserAvatar 
              username={githubUser.githubUsername}
              avatarUrl={githubUser.avatarUrl}
              size={40}
              variant="solid"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                @{githubUser.githubUsername}
              </p>
              <p className="text-xs text-muted-foreground">
                {navItems.find(n => n.id === activeTab)?.label || 'Account'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/attach-bounty"
              className="flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Mobile Tab Pills (scrollable) */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all shrink-0',
                  isActive 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-56 shrink-0">
          {/* User Profile Card */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <UserAvatar 
                username={githubUser.githubUsername}
                avatarUrl={githubUser.avatarUrl}
                size={40}
                variant="solid"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  @{githubUser.githubUsername}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {githubUser.githubId}
                </p>
              </div>
            </div>
            
            {/* Quick Action */}
            <Link
              href="/app/attach-bounty"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="w-4 h-4" />
              Create Bounty
            </Link>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all',
                    isActive 
                      ? 'bg-primary/10 text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : '')} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Page Header - Hidden on mobile (shown in mobile header) */}
          <div className="hidden lg:block mb-6">
            <h1 className="font-instrument-serif text-2xl md:text-3xl text-foreground mb-1">
              {navItems.find(n => n.id === activeTab)?.label || 'Account'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'sponsored' && 'Manage your funded bounties and track contributor activity'}
              {activeTab === 'earnings' && 'View your earned bounties and payment history'}
              {activeTab === 'controls' && 'Manage your contributor settings and preferences'}
              {activeTab === 'settings' && 'Update your account settings and connected services'}
              {activeTab === 'admin' && 'Manage beta applications and platform settings'}
            </p>
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in-up">
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
                  showNoBountiesState={sponsor.showNoBountiesState}
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
                  onChangeWallet={walletManagement.changeModal.open}
                  openDeleteWalletModal={walletManagement.deleteModal.open}
                  logout={logout}
                  refreshProfile={accountActions.refreshProfile}
                />
              )
            )}

            {/* Admin tab */}
            {activeTab === 'admin' && isAdmin && (
              <AdminTab
                betaApplications={beta.applications}
                betaLoading={beta.loading}
                betaError={beta.error}
                handleReview={beta.handleReview}
                betaProcessing={beta.processing}
                networkFees={networkFees}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ChangeWalletModal
        isOpen={walletManagement.changeModal.isOpen}
        onClose={walletManagement.changeModal.close}
        connectedAddress={wallet.address}
        isConnected={wallet.isConnected}
        onConfirm={walletManagement.changeModal.handleChangeWallet}
        status={walletManagement.changeModal.status}
      />
      <DeleteWalletModal deleteModal={walletManagement.deleteModal} />
      <ManageReposModal
        show={repoManager.showManageReposModal}
        repositories={repoManager.repositories}
        loading={repoManager.loadingRepos}
        close={repoManager.closeManageReposModal}
        handleInstallApp={repoManager.handleInstallApp}
        hasBetaAccess={repoManager.hasBetaAccess}
      />
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
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

function TabError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
