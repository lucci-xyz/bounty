'use client';

import { useState } from 'react';
import { formatAmount, formatTimeLeft, getStatusColor } from '@/lib/formatters';

/**
 * Dashboard bounty table with sorting, pagination, and mobile-responsive layout
 */
export default function BountyTable({ bounties, onManage }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const bountiesPerPage = 5;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Sort bounties
  const sortedBounties = [...bounties].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue, bValue;
    
    if (sortConfig.key === 'bounty') {
      aValue = a.repoFullName.toLowerCase();
      bValue = b.repoFullName.toLowerCase();
    } else if (sortConfig.key === 'status') {
      aValue = a.status;
      bValue = b.status;
    } else if (sortConfig.key === 'amount') {
      aValue = Number(a.amount);
      bValue = Number(b.amount);
    } else if (sortConfig.key === 'timeLeft') {
      const now = Date.now();
      const aDeadline = a.deadline ? Number(a.deadline) * 1000 : 0;
      const bDeadline = b.deadline ? Number(b.deadline) * 1000 : 0;
      
      // Treat expired (past) deadlines as oldest (smallest values)
      aValue = aDeadline > now ? aDeadline : -Infinity;
      bValue = bDeadline > now ? bDeadline : -Infinity;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedBounties.length / bountiesPerPage);
  const startIndex = (currentPage - 1) * bountiesPerPage;
  const endIndex = startIndex + bountiesPerPage;
  const displayBounties = sortedBounties.slice(startIndex, endIndex);

  if (bounties.length === 0) {
    return (
      <div className="text-center py-15 px-5">
        <p className="text-sm text-secondary">
          No bounties found
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="desktop-table">
        {/* Table Header */}
        <div className="table-header grid grid-cols-12 gap-4">
          <div 
            className="col-span-5 flex items-center gap-1 cursor-pointer" 
            onClick={() => handleSort('bounty')}
            style={{ userSelect: 'none' }}
          >
            Bounty
            <span style={{ fontSize: '9px', opacity: sortConfig.key === 'bounty' ? 1 : 0.3 }}>
              {sortConfig.key === 'bounty' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
          <div 
            className="col-span-2 flex items-center justify-center gap-1 cursor-pointer"
            onClick={() => handleSort('status')}
            style={{ userSelect: 'none' }}
          >
            Status
            <span style={{ fontSize: '9px', opacity: sortConfig.key === 'status' ? 1 : 0.3 }}>
              {sortConfig.key === 'status' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
          <div 
            className="col-span-3 flex items-center gap-1 cursor-pointer"
            onClick={() => handleSort('timeLeft')}
            style={{ userSelect: 'none' }}
          >
            Time Left
            <span style={{ fontSize: '9px', opacity: sortConfig.key === 'timeLeft' ? 1 : 0.3 }}>
              {sortConfig.key === 'timeLeft' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
          <div 
            className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer"
            onClick={() => handleSort('amount')}
            style={{ userSelect: 'none' }}
          >
            Amount
            <span style={{ fontSize: '9px', opacity: sortConfig.key === 'amount' ? 1 : 0.3 }}>
              {sortConfig.key === 'amount' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
        </div>

        {/* Table Rows */}
        {displayBounties.map((bounty, index) => (
          <div 
            key={bounty.bountyId}
            className="table-row grid grid-cols-12 gap-4 px-4 items-center"
            onClick={() => onManage && onManage(bounty.bountyId)}
          >
            <div className="col-span-5">
              <div className="text-sm font-medium text-primary">
                {bounty.repoFullName}#{bounty.issueNumber}
              </div>
            </div>
            <div className="col-span-2 flex justify-center">
              <span className="status-badge" style={{
                background: `${getStatusColor(bounty.status)}20`,
                color: getStatusColor(bounty.status)
              }}>
                {bounty.status}
              </span>
            </div>
            <div className="col-span-3 text-sm text-secondary">
              {formatTimeLeft(bounty.deadline)}
            </div>
            <div className="col-span-2 text-right text-sm font-semibold text-primary">
              ${formatAmount(bounty.amount, bounty.tokenSymbol)}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="mobile-cards">
        {displayBounties.map((bounty) => (
          <div
            key={bounty.bountyId}
            onClick={() => onManage && onManage(bounty.bountyId)}
            style={{
              padding: '14px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              marginBottom: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 130, 123, 0.02)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div className="flex justify-between items-center mb-3 gap-2 min-h-6">
              <div className="text-sm font-medium text-primary flex-1 truncate">
                {bounty.repoFullName}#{bounty.issueNumber}
              </div>
              <span className="badge flex-shrink-0 max-w-[85px] truncate" style={{
                background: `${getStatusColor(bounty.status)}15`,
                color: getStatusColor(bounty.status)
              }}>
                {bounty.status}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs gap-2">
              <span className="text-secondary truncate flex-1">
                {formatTimeLeft(bounty.deadline)}
              </span>
              <span className="text-base font-semibold flex-shrink-0 whitespace-nowrap">
                ${formatAmount(bounty.amount, bounty.tokenSymbol)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="table-pagination">
        <div className="table-pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedBounties.length)} of {sortedBounties.length}
        </div>
        
        {totalPages > 1 && (
          <div className="table-pagination-controls">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ‹
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Responsive CSS */}
      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-table {
            display: block;
          }
          .mobile-cards {
            display: none;
          }
        }
        
        @media (max-width: 767px) {
          .desktop-table {
            display: none;
          }
          .mobile-cards {
            display: block;
            padding: 0 16px;
          }
        }
      `}</style>
    </>
  );
}
