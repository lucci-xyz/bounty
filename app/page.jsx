'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dummyBounties } from '@/dummy-data/bounties';
import { useNetwork } from '@/components/NetworkProvider';
import { BetaGate } from '@/components/BetaGate';

export default function Home() {
  const [bounties, setBounties] = useState([]);
  const [filteredBounties, setFilteredBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { registry } = useNetwork();

  useEffect(() => {
    async function fetchBounties() {
      try {
        const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';
        
        if (useDummyData) {
          // Use dummy data
          await new Promise(resolve => setTimeout(resolve, 500));
          setBounties(dummyBounties);
          setFilteredBounties(dummyBounties);
        } else {
          // Fetch from API
          const response = await fetch('/api/bounties/open');
          if (!response.ok) {
            throw new Error('Failed to fetch bounties');
          }
          const data = await response.json();
          // Ensure data is an array
          const bountiesArray = Array.isArray(data) ? data : [];
          setBounties(bountiesArray);
          setFilteredBounties(bountiesArray);
        }
      } catch (err) {
        console.error('Error fetching bounties:', err);
        setError(err.message);
        setBounties([]);
        setFilteredBounties([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBounties();
  }, []);

  useEffect(() => {
    let result = [...bounties];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.issueDescription?.toLowerCase().includes(query) ||
        b.repoFullName?.toLowerCase().includes(query) ||
        b.labels?.some(label => label.toLowerCase().includes(query))
      );
    }

    setFilteredBounties(result);
  }, [bounties, searchQuery]);

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'USDC' ? 6 : 18;
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDeadline(deadline) {
    const date = new Date(Number(deadline) * 1000);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day';
    } else {
      return `${diffDays} days`;
    }
  }

  function formatStars(stars) {
    if (!stars && stars !== 0) {
      return '0';
    }
    if (stars >= 1000) {
      return `${(stars / 1000).toFixed(1)}k`;
    }
    return stars.toString();
  }

  function getBlockExplorerUrl(network, txHash) {
    const config = registry?.[network];
    if (!config || !txHash) return null;
    return `${config.blockExplorerUrl}/tx/${txHash}`;
  }

  function formatStatusLabel(status) {
    if (!status) return 'Unknown';
    return status
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function getStatusStyles(status) {
    switch ((status || '').toLowerCase()) {
      case 'open':
        return {
          badge: 'bg-emerald-50 text-emerald-700',
          dot: 'bg-emerald-500'
        };
      case 'in-progress':
        return {
          badge: 'bg-amber-50 text-amber-700',
          dot: 'bg-amber-500'
        };
      case 'resolved':
        return {
          badge: 'bg-slate-100 text-slate-700',
          dot: 'bg-slate-500'
        };
      default:
        return {
          badge: 'bg-muted text-foreground/70',
          dot: 'bg-foreground/50'
        };
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-medium tracking-tight mb-2">Bounties</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-medium tracking-tight mb-2">Bounties</h1>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <p className="text-destructive text-sm">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-2 text-foreground/90">
            Bounties
          </h1>
        <p className="text-base text-muted-foreground">
          Contributing to open source, rewarded in crypto
          </p>
        </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex flex-1 w-full max-w-[520px] min-w-[320px] items-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 rounded-full border border-border/60 bg-white text-sm text-muted-foreground placeholder:text-muted-foreground/70 shadow-[0_6px_18px_rgba(15,23,42,0.08)] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            style={{
              borderRadius: '9999px',
              height: '44px',
              paddingLeft: '26px',
              paddingRight: '26px'
            }}
          />
      </div>
      </div>

      {/* Bounties Grid */}
      {filteredBounties.length === 0 ? (
        <div className="text-center py-16 px-6 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground mb-6">
            {bounties.length === 0 ? 'No open bounties at the moment.' : 'No bounties match your filters.'}
          </p>
          {bounties.length > 0 && (
            <button
              onClick={() => {
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {filteredBounties.map((bounty) => {
            const statusStyles = getStatusStyles(bounty.status);
            const statusLabel = formatStatusLabel(bounty.status);
            return (
              <div 
                key={bounty.bountyId} 
                className="bounty-card group flex flex-col gap-6"
              >
                <div className="flex items-start justify-between gap-8">
                  <div className="space-y-3 min-w-0">
                    <div>
                      <h3
                        className="text-xs font-light leading-snug text-foreground/90"
                        style={{ 
                          fontSize: '1.2rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {bounty.issueDescription || 'Bounty'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {bounty.repoFullName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-light text-[#0D473F]/90 dark:text-primary">
                      {formatAmount(bounty.amount, bounty.tokenSymbol)}
                    </div>
                    <div className="text-xs text-muted-foreground tracking-[0.4em] uppercase">
                      {bounty.tokenSymbol}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusStyles.badge}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${statusStyles.dot}`} />
                    {statusLabel}
                  </span>
                </div>

                <Link
                  href={`/dashboard/bounty/${bounty.bountyId}`}
                  className="mt-auto inline-flex w-full items-center justify-center rounded-full border border-border/70 bg-muted/80 px-6 py-3 text-sm font-medium text-foreground/90 transition-all hover:bg-gray-100"
                  style={{ color: 'inherit' }}
                >
                  View
                </Link>
              </div>
            );
          })}
      </div>
      )}
    </div>
  );
}
