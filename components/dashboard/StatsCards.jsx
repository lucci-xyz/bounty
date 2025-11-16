'use client';

/**
 * Dashboard statistics cards display
 */
export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="card stats-card stats-card-gradient animate-fade-in-up delay-100">
        <div className="stats-card-label">
          VALUE LOCKED
        </div>
        <div className="stats-card-value">
          ${stats?.totalValueLocked.toLocaleString() || '0'}
        </div>
        <div className="stats-card-subtitle">
          In {stats?.openBounties || 0} open bounties
        </div>
      </div>

      <div className="card stats-card animate-fade-in-up delay-200">
        <div className="stats-card-label">
          TOTAL PAID
        </div>
        <div className="stats-card-value text-primary">
          ${stats?.totalValuePaid.toLocaleString() || '0'}
        </div>
        <div className="stats-card-subtitle">
          To {stats?.resolvedBounties || 0} contributors
        </div>
      </div>

      <div className="card stats-card animate-fade-in-up delay-300">
        <div className="stats-card-label">
          TOTAL BOUNTIES
        </div>
        <div className="stats-card-value">
          {stats?.totalBounties || 0}
        </div>
        <div className="stats-card-subtitle">
          {stats?.openBounties || 0} open · {stats?.resolvedBounties || 0} resolved
        </div>
      </div>

      <div className="card stats-card animate-fade-in-up delay-400">
        <div className="stats-card-label">
          REFUNDED
        </div>
        <div className="stats-card-value">
          {stats?.refundedBounties || 0}
        </div>
        <div className="stats-card-subtitle">
          Expired bounties
        </div>
      </div>
    </div>
  );
}

