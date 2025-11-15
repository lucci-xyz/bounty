'use client';

import { useState, useEffect } from 'react';

export default function BountyCard({ bounty, showActions = false, onManage }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'USDC' || tokenSymbol === 'MUSD' ? (tokenSymbol === 'USDC' ? 6 : 18) : 18;
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
    return stars?.toString() || '0';
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'var(--color-primary)';
      case 'resolved':
        return 'var(--color-success)';
      case 'refunded':
        return 'var(--color-warning)';
      case 'canceled':
        return 'var(--color-text-secondary)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  return (
    <div 
      className="card" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '16px',
        padding: 'clamp(16px, 3vw, 24px)',
        transition: 'all 0.3s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        marginBottom: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
      }}
    >
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
            {bounty.repoStars && (
              <span style={{ 
                fontSize: 'clamp(13px, 2vw, 14px)',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ★ {formatStars(bounty.repoStars)}
              </span>
            )}
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              background: `${getStatusColor(bounty.status)}15`,
              color: getStatusColor(bounty.status),
              fontSize: '12px',
              fontWeight: '500',
              textTransform: 'capitalize'
            }}>
              {bounty.status}
            </span>
          </div>
          
          {bounty.issueDescription && (
            <p style={{ 
              fontSize: 'clamp(14px, 2vw, 15px)', 
              color: 'var(--color-text-secondary)', 
              lineHeight: '1.5',
              margin: '0 0 12px 0'
            }}>
              {bounty.issueDescription}
            </p>
          )}

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
      
      {showActions && onManage && (
        <div style={{ 
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => onManage(bounty.bountyId)}
            className="btn btn-secondary"
            style={{ margin: 0, fontSize: '14px', flex: 1 }}
          >
            Manage
          </button>
        </div>
      )}
    </div>
  );
}

