'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dummyBounties } from '@/dummy-data/bounties';

export default function Home() {
  const [bounties, setBounties] = useState([]);
  const [filteredBounties, setFilteredBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    async function fetchBounties() {
      try {
        // Use dummy data for now
        // Uncomment below to fetch from API instead
        // const response = await fetch('/api/bounties/open');
        // if (!response.ok) {
        //   throw new Error('Failed to fetch bounties');
        // }
        // const data = await response.json();
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setBounties(dummyBounties);
        setFilteredBounties(dummyBounties);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBounties();
  }, []);

  useEffect(() => {
    let result = [...bounties];

    // Apply language filter
    if (selectedLanguages.length > 0) {
      result = result.filter(b => selectedLanguages.includes(b.language));
    }

    // Apply label filter
    if (selectedLabels.length > 0) {
      result = result.filter(b => b.labels && b.labels.some(label => selectedLabels.includes(label)));
    }

    // Apply sorting
    switch (sortBy) {
      case 'highest':
        result.sort((a, b) => Number(b.amount) - Number(a.amount));
        break;
      case 'lowest':
        result.sort((a, b) => Number(a.amount) - Number(b.amount));
        break;
      case 'deadline':
        result.sort((a, b) => Number(a.deadline) - Number(b.deadline));
        break;
      case 'stars':
        result.sort((a, b) => (b.repoStars || 0) - (a.repoStars || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    setFilteredBounties(result);
  }, [bounties, sortBy, selectedLanguages, selectedLabels]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowLanguageDropdown(false);
      setShowLabelDropdown(false);
    };
    
    if (showLanguageDropdown || showLabelDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showLanguageDropdown, showLabelDropdown]);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (stars >= 1000) {
      return `${(stars / 1000).toFixed(1)}k`;
    }
    return stars.toString();
  }

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
        <h1>Open Bounties</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading bounties...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
        <h1>Open Bounties</h1>
        <div className="card" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)' }}>
          <p style={{ color: '#ff3b30', margin: 0 }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  // Get unique languages and labels for filters
  const languages = ['all', ...new Set(bounties.map(b => b.language).filter(Boolean))];
  const allLabels = ['all', ...new Set(bounties.flatMap(b => b.labels || []))];

  return (
    <div className="container" style={{ 
      maxWidth: '1200px', 
      padding: '40px 20px',
      width: '100%'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: 'clamp(32px, 6vw, 48px)', 
          marginBottom: '12px' 
        }}>
          Open Bounties
        </h1>
        <p style={{ 
          fontSize: 'clamp(16px, 2.5vw, 18px)', 
          color: 'var(--color-text-secondary)' 
        }}>
          {filteredBounties.length} {filteredBounties.length === 1 ? 'bounty' : 'bounties'} available
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Sort Pills */}
        {[
          { value: 'newest', label: 'Newest' },
          { value: 'highest', label: 'Highest $' },
          { value: 'deadline', label: 'Ending Soon' },
          { value: 'stars', label: 'Most ★' }
        ].map(sort => (
          <button
            key={sort.value}
            onClick={() => setSortBy(sort.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: sortBy === sort.value ? 'var(--color-primary)' : 'var(--color-background-secondary)',
              color: sortBy === sort.value ? 'white' : 'var(--color-text-secondary)',
              fontSize: 'clamp(12px, 2vw, 14px)',
              cursor: 'pointer',
              fontWeight: sortBy === sort.value ? '600' : '400',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {sort.label}
          </button>
        ))}

        <div style={{ 
          width: '1px', 
          height: '24px', 
          background: 'var(--color-border)',
          display: isMobile ? 'none' : 'block'
        }} />

        {/* Language Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLanguageDropdown(!showLanguageDropdown);
              setShowLabelDropdown(false);
            }}
            style={{
              padding: '8px 14px',
              paddingRight: selectedLanguages.length > 0 ? '32px' : '14px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: selectedLanguages.length > 0 ? 'rgba(0, 130, 123, 0.12)' : 'var(--color-background-secondary)',
              color: selectedLanguages.length > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: 'clamp(12px, 2vw, 13px)',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              outline: 'none',
              position: 'relative',
              minWidth: 'fit-content'
            }}
            onMouseEnter={(e) => {
              if (selectedLanguages.length === 0) {
                e.target.style.background = 'var(--color-background)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedLanguages.length === 0) {
                e.target.style.background = 'var(--color-background-secondary)';
              }
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              {selectedLanguages.length === 0 ? 'Language' : 
               selectedLanguages.length === 1 ? selectedLanguages[0] : 
               `${selectedLanguages.length} languages`}
            </span>
            {selectedLanguages.length === 0 && (
              <span style={{ fontSize: '10px', opacity: 0.6, transform: 'translateY(1px)', display: 'inline-block' }}>▼</span>
            )}
            {selectedLanguages.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLanguages([]);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  fontWeight: '600',
                  lineHeight: '1'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0, 130, 123, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                ×
              </span>
            )}
          </button>
          
          {showLanguageDropdown && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 100,
                minWidth: '160px',
                overflow: 'hidden',
                padding: '6px'
              }}
            >
              {languages.filter(l => l !== 'all').map(lang => {
                const isSelected = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLanguages(prev => 
                        isSelected 
                          ? prev.filter(l => l !== lang)
                          : [...prev, lang]
                      );
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: isSelected ? 'rgba(0, 130, 123, 0.12)' : 'transparent',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '6px',
                      fontWeight: isSelected ? '500' : '400'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.background = 'var(--color-background-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.background = 'transparent';
                      }
                    }}
                  >
                    {lang}
                    {isSelected && <span style={{ fontSize: '11px' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Label Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLabelDropdown(!showLabelDropdown);
              setShowLanguageDropdown(false);
            }}
            style={{
              padding: '8px 14px',
              paddingRight: selectedLabels.length > 0 ? '32px' : '14px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: selectedLabels.length > 0 ? 'rgba(0, 130, 123, 0.12)' : 'var(--color-background-secondary)',
              color: selectedLabels.length > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: 'clamp(12px, 2vw, 13px)',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              outline: 'none',
              position: 'relative',
              minWidth: 'fit-content'
            }}
            onMouseEnter={(e) => {
              if (selectedLabels.length === 0) {
                e.target.style.background = 'var(--color-background)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedLabels.length === 0) {
                e.target.style.background = 'var(--color-background-secondary)';
              }
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              {selectedLabels.length === 0 ? 'Label' : 
               selectedLabels.length === 1 ? selectedLabels[0] : 
               `${selectedLabels.length} labels`}
            </span>
            {selectedLabels.length === 0 && (
              <span style={{ fontSize: '10px', opacity: 0.6, transform: 'translateY(1px)', display: 'inline-block' }}>▼</span>
            )}
            {selectedLabels.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLabels([]);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  fontWeight: '600',
                  lineHeight: '1'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0, 130, 123, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                ×
              </span>
            )}
          </button>
          
          {showLabelDropdown && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 100,
                minWidth: '160px',
                maxHeight: '280px',
                overflow: 'auto',
                padding: '6px'
              }}
            >
              {allLabels.filter(l => l !== 'all' && l).map(label => {
                const isSelected = selectedLabels.includes(label);
                return (
                  <button
                    key={label}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLabels(prev => 
                        isSelected 
                          ? prev.filter(l => l !== label)
                          : [...prev, label]
                      );
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: isSelected ? 'rgba(0, 130, 123, 0.12)' : 'transparent',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '6px',
                      fontWeight: isSelected ? '500' : '400'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.background = 'var(--color-background-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.background = 'transparent';
                      }
                    }}
                  >
                    {label}
                    {isSelected && <span style={{ fontSize: '11px' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {filteredBounties.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            {bounties.length === 0 ? 'No open bounties at the moment.' : 'No bounties match your filters.'}
          </p>
          {bounties.length === 0 ? (
            <Link href="/about" className="btn btn-primary">
              Learn More
            </Link>
          ) : (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredBounties.map((bounty) => (
            <div key={bounty.bountyId} className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '16px',
              padding: 'clamp(16px, 3vw, 24px)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'start', 
                gap: '16px',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <div style={{ flex: '1', minWidth: '0', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <a 
                      href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        fontSize: 'clamp(16px, 2.5vw, 18px)',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        fontWeight: '600',
                        wordBreak: 'break-word'
                      }}
                    >
                      {bounty.repoFullName}#{bounty.issueNumber}
                    </a>
                    <span style={{ 
                      fontSize: 'clamp(13px, 2vw, 14px)',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ★ {formatStars(bounty.repoStars)}
                    </span>
                  </div>
                  
                  <p style={{ 
                    fontSize: 'clamp(14px, 2vw, 15px)', 
                    color: 'var(--color-text-secondary)', 
                    lineHeight: '1.5',
                    margin: '0 0 12px 0'
                  }}>
                    {bounty.issueDescription}
                  </p>

                  <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    flexWrap: 'wrap', 
                    fontSize: 'clamp(11px, 1.8vw, 12px)', 
                    alignItems: 'center' 
                  }}>
                    {bounty.language && (
                      <span style={{ 
                        padding: '4px 10px',
                        background: 'rgba(0, 130, 123, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--color-primary)',
                        fontWeight: '500'
                      }}>
                        {bounty.language}
                      </span>
                    )}
                    {bounty.labels && bounty.labels.length > 0 && bounty.labels.map((label, idx) => (
                      <span 
                        key={idx}
                        style={{ 
                          padding: '4px 10px',
                          background: 'var(--color-background-secondary)',
                          borderRadius: '12px',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                
                {bounty.txHash ? (
                  <a
                    href={`https://sepolia.basescan.org/tx/${bounty.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      padding: isMobile ? '8px 12px' : 'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 20px)',
                      background: 'rgba(131, 238, 232, 0.15)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      minWidth: isMobile ? 'auto' : 'clamp(120px, 20vw, 140px)',
                      width: isMobile ? 'fit-content' : 'auto',
                      alignSelf: isMobile ? 'center' : 'auto',
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = 'rgba(131, 238, 232, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = 'rgba(131, 238, 232, 0.15)';
                    }}
                  >
                    <div style={{ 
                      fontSize: isMobile ? '16px' : 'clamp(18px, 3vw, 20px)', 
                      fontWeight: '600', 
                      color: 'var(--color-primary)', 
                      marginBottom: '4px' 
                    }}>
                      {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                    </div>
                    <div style={{ 
                      fontSize: isMobile ? '11px' : 'clamp(12px, 2vw, 13px)', 
                      color: 'var(--color-text-secondary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px' 
                    }}>
                      {formatDeadline(bounty.deadline)} left
                      <span>↗</span>
                    </div>
                  </a>
                ) : (
                  <div style={{ 
                    padding: isMobile ? '8px 12px' : 'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 20px)',
                    background: 'rgba(131, 238, 232, 0.15)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: isMobile ? 'auto' : 'clamp(120px, 20vw, 140px)',
                    width: isMobile ? 'fit-content' : 'auto',
                    alignSelf: isMobile ? 'center' : 'auto'
                  }}>
                    <div style={{ 
                      fontSize: isMobile ? '16px' : 'clamp(18px, 3vw, 20px)', 
                      fontWeight: '600', 
                      color: 'var(--color-primary)', 
                      marginBottom: '4px' 
                    }}>
                      {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                    </div>
                    <div style={{ 
                      fontSize: isMobile ? '11px' : 'clamp(12px, 2vw, 13px)', 
                      color: 'var(--color-text-secondary)' 
                    }}>
                      {formatDeadline(bounty.deadline)} left
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
