"use client";

import { formatDate, getStatusColor } from '@/shared/lib';
import { StatBlock } from '@/features/account/components/StatBlock';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';

/**
 * AdminTab displays and manages beta applications for admin users.
 *
 * Props:
 * - betaApplications: Array of application objects
 * - betaLoading: Boolean, true if loading
 * - betaError: String, error message if loading failed
 * - handleReview: Function to approve/reject applications
 * - betaProcessing: Object with loading state per application ID
 */
export function AdminTab({ betaApplications, betaLoading, betaError, handleReview, betaProcessing }) {
  // Show error message if present
  if (betaError) {
    return (
      <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {betaError}
      </div>
    );
  }

  // Show loading message
  if (betaLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Loading applications...
      </div>
    );
  }

  return (
    <>
      {/* Stat blocks showing numbers for applications */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatBlock className="animate-fade-in-up delay-100" label="Total Applications" value={betaApplications.length} />
        <StatBlock
          className="animate-fade-in-up delay-200"
          label="Pending Review"
          value={betaApplications.filter((app) => app.status === 'pending').length}
        />
        <StatBlock
          className="animate-fade-in-up delay-300"
          label="Approved"
          value={betaApplications.filter((app) => app.status === 'approved').length}
        />
        <StatBlock
          className="animate-fade-in-up delay-400"
          label="Rejected"
          value={betaApplications.filter((app) => app.status === 'rejected').length}
        />
      </div>

      {/* List of applications pending review */}
      {betaApplications.filter((app) => app.status === 'pending').length > 0 && (
        <div className="mb-8">
          <h2 className="text-foreground mb-4" style={{ fontSize: '18px', fontWeight: 400 }}>
            Pending Applications
          </h2>
          <div className="space-y-3">
            {betaApplications
              .filter((app) => app.status === 'pending')
              .map((app) => (
                <div
                  key={app.id}
                  className="bg-card border border-border/40 rounded-2xl p-5 flex justify-between items-center gap-5"
                >
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <LinkFromCatalog
                        section="github"
                        link="userProfile"
                        params={{ username: app.githubUsername }}
                        className="text-primary hover:underline"
                        style={{ fontSize: '16px', fontWeight: 400, textDecoration: 'none' }}
                      >
                        @{app.githubUsername}
                      </LinkFromCatalog>
                      <span
                        className="bounty-tag"
                        style={{
                          background: `${getStatusColor(app.status)}15`,
                          color: getStatusColor(app.status),
                          fontSize: '11px'
                        }}
                      >
                        {app.status}
                      </span>
                    </div>
                    <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: 300 }}>
                      Applied: {formatDate(app.appliedAt)}
                    </div>
                    {app.email && (
                      <div
                        className="text-muted-foreground"
                        style={{ fontSize: '13px', fontWeight: 300, marginTop: '2px' }}
                      >
                        Email: {app.email}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(app.id, 'approve')}
                      disabled={betaProcessing[app.id]}
                      className="premium-btn bg-primary text-primary-foreground"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReview(app.id, 'reject')}
                      disabled={betaProcessing[app.id]}
                      className="premium-btn"
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--muted-foreground)'
                      }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

