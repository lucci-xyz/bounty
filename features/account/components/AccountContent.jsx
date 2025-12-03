'use client';
import { cn } from '@/shared/lib';
import Link from 'next/link';
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
import UserAvatar from '@/shared/components/UserAvatar';

// Icons for sidebar navigation
function BountyIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WalletIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}

function ControlsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AdminIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

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
                  openChangeWalletModal={walletManagement.changeModal.open}
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
        changeModal={walletManagement.changeModal}
        isConnected={wallet.isConnected}
        address={wallet.address}
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
