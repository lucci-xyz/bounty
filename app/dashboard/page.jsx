'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBounties } from '@/lib/hooks/useBounties';
import { useWallet } from '@/lib/hooks/useWallet';
import { useStats } from '@/lib/hooks/useStats';
import StatsCards from '@/components/dashboard/StatsCards';
import BountyTable from '@/components/dashboard/BountyTable';
import EmptyState from '@/components/dashboard/EmptyState';

/**
 * Dashboard page for authenticated users to view their bounties
 */
export default function Dashboard() {
  const router = useRouter();
  const { githubUser, loading: authLoading } = useAuth();
  const { 
    bounties, 
    loading: bountiesLoading,
    fetchBounties 
  } = useBounties({ 
    endpoint: '/api/user/bounties',
    fetchOnMount: false 
  });
  const { hasWallet, checkWallet } = useWallet(githubUser?.githubId, false);
  const { stats, fetchStats } = useStats(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch data when user is authenticated
  useEffect(() => {
    const loadDashboardData = async () => {
      if (githubUser) {
        // Hooks will handle dummy data internally if NEXT_PUBLIC_USE_DUMMY_DATA is true
        await Promise.all([
          fetchBounties(),
          fetchStats(),
          checkWallet(githubUser.githubId)
        ]);
        setDataLoading(false);
      }
    };

    if (!authLoading) {
      if (!githubUser) {
        router.push('/');
      } else {
        loadDashboardData();
      }
    }
  }, [githubUser, authLoading, router, fetchBounties, fetchStats, checkWallet]);

  const handleManage = (bountyId) => {
    router.push(`/dashboard/bounty/${bountyId}`);
  };

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <div className="container-lg">
        <p className="text-secondary">Loading...</p>
      </div>
    );
  }

  if (!githubUser) {
    return null;
  }

  const showEmptyState = bounties.length === 0 && !hasWallet;

  return (
    <div className="container-md" style={{ padding: '32px 24px' }}>
      <div className="dashboard-header animate-fade-in-up">
        <h1 className="dashboard-greeting">
          Hello @{githubUser.githubUsername}
        </h1>
        <p className="dashboard-subtitle">
          {showEmptyState ? 'Get started by funding your first bounty' : "Here's what's happening with your bounties"}
        </p>
      </div>

      {showEmptyState && <EmptyState />}

      {!showEmptyState && (
        <>
          <StatsCards stats={stats} />

          <div className="card dashboard-section animate-fade-in-up delay-400 p-6 mb-0">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">
                Bounties
              </h2>
            </div>

            <BountyTable bounties={bounties} onManage={handleManage} />
          </div>
        </>
      )}
    </div>
  );
}
