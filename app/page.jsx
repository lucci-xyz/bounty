'use client';

import { useBounties } from '@/lib/hooks/useBounties';
import { useResponsive } from '@/lib/hooks/useResponsive';
import BountyFilters from '@/components/BountyFilters';
import BountyList from '@/components/BountyList';

/**
 * Home page displaying all open bounties with filtering and sorting
 */
export default function Home() {
  const { isMobile } = useResponsive();
  const {
    bounties,
    allBounties,
    loading,
    error,
    sortBy,
    setSortBy,
    selectedLanguages,
    setSelectedLanguages,
    selectedLabels,
    setSelectedLabels,
    availableLanguages,
    availableLabels
  } = useBounties({ fetchOnMount: true });

  if (loading) {
    return (
      <div className="container-md">
        <p className="text-secondary">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-md">
        <div className="card" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)' }}>
          <p className="m-0" style={{ color: '#ff3b30' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-md">
      <div className={isMobile ? 'mb-5' : 'mb-8'}>
        <h1 className="page-title animate-fade-in-up text-center">
          Bounties
        </h1>
        <p className="page-subtitle">
          {bounties.length} {bounties.length === 1 ? 'bounty' : 'bounties'} available
        </p>
      </div>

      <BountyFilters
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedLanguages={selectedLanguages}
        setSelectedLanguages={setSelectedLanguages}
        selectedLabels={selectedLabels}
        setSelectedLabels={setSelectedLabels}
        availableLanguages={availableLanguages}
        availableLabels={availableLabels}
        isMobile={isMobile}
      />

      {bounties.length === 0 ? (
        <div className="card text-center py-15 px-5">
          <p className="text-lg mb-6 text-secondary">
            {allBounties.length === 0 ? 'No open bounties at the moment.' : 'No bounties match your filters.'}
          </p>
          {allBounties.length > 0 && (
            <button
              onClick={() => {
                setSelectedLanguages([]);
                setSelectedLabels([]);
              }}
              className="btn btn-primary"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <BountyList bounties={bounties} isMobile={isMobile} />
      )}
    </div>
  );
}
