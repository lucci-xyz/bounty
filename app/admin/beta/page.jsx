'use client';

/**
 * BetaAdminPage displays and manages beta access applications for admins.
 */
import { useRouter } from 'next/navigation';
import { cn, formatDate, STATUS_VARIANTS } from '@/lib';
import { useBetaApplications } from '@/ui/hooks/useBetaApplications';
import { LinkFromCatalog } from '@/ui/components/LinkFromCatalog';

/**
 * Maps application status to CSS classes.
 */
const BETA_STATUS_CLASS_MAP = {
  approved: STATUS_VARIANTS.success,
  rejected: STATUS_VARIANTS.error,
  pending: STATUS_VARIANTS.loading
};

/**
 * Beta access admin page component.
 * Allows admins to review, approve, or reject beta access applications.
 */
export default function BetaAdminPage() {
  const router = useRouter();

  /**
   * Fetch beta application data and management actions.
   * Redirects to home if unauthorized.
   */
  const {
    applications,
    pendingApplications,
    reviewedApplications,
    loading,
    error,
    processing,
    handleReview
  } = useBetaApplications({
    onUnauthorized: () => router.push('/')
  });

  /**
   * Handles approving or rejecting a beta application.
   * @param {string} applicationId - The application ID
   * @param {'approve'|'reject'} action - The review action
   */
  const handleReviewAction = async (applicationId, action) => {
    try {
      await handleReview(applicationId, action);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Render loading state if applications are loading
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="mb-2 text-[clamp(24px,4vw,32px)] font-medium tracking-[-0.02em] text-foreground">
          Beta Access Management
        </h1>
        <p className="text-sm font-light text-muted-foreground">Loading applications...</p>
      </div>
    );
  }

  // Render error state if there is an error loading applications
  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="mb-8 text-[clamp(24px,4vw,32px)] font-medium tracking-[-0.02em] text-foreground">
          Beta Access Management
        </h1>
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  // Render main beta access admin page
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="mb-2 text-[clamp(24px,4vw,32px)] font-medium tracking-[-0.02em] text-foreground">
          Beta Access Management
        </h1>
        <p className="text-sm font-light text-muted-foreground">
          Review and manage beta access applications
        </p>
      </div>

      {/* Stats: Show summary of beta applications */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stat-card animate-fade-in-up delay-100">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Total Applications
          </div>
          <div className="text-[32px] font-light tracking-[-0.02em] text-foreground">
            {applications.length}
          </div>
        </div>
        <div className="stat-card animate-fade-in-up delay-200">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Pending Review
          </div>
          <div className="text-[32px] font-light tracking-[-0.02em] text-amber-500">
            {pendingApplications.length}
          </div>
        </div>
        <div className="stat-card animate-fade-in-up delay-300">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Approved
          </div>
          <div className="text-[32px] font-light tracking-[-0.02em] text-primary">
            {applications.filter(app => app.status === 'approved').length}
          </div>
        </div>
        <div className="stat-card animate-fade-in-up delay-400">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Rejected
          </div>
          <div className="text-[32px] font-light tracking-[-0.02em] text-destructive">
            {applications.filter(app => app.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Pending Applications: Review actions for pending applications */}
      {pendingApplications.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-medium text-foreground">
            Pending Applications
          </h2>
          <div className="space-y-3">
            {pendingApplications.map(app => (
              <div
                key={app.id}
                className="bg-card border border-border/40 rounded-2xl p-5 flex justify-between items-center gap-5 animate-fade-in-up"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <LinkFromCatalog
                      section="github"
                      link="userProfile"
                      params={{ username: app.githubUsername }}
                      className="text-base font-medium text-primary hover:underline"
                    >
                      @{app.githubUsername}
                    </LinkFromCatalog>
                    <span
                      className={cn(
                        'bounty-tag text-[11px]',
                        BETA_STATUS_CLASS_MAP[app.status] || 'bg-muted text-foreground/70 border border-border/40'
                      )}
                    >
                      {app.status}
                    </span>
                  </div>
                  <div className="text-sm font-light text-muted-foreground">
                    Applied: {formatDate(app.appliedAt)}
                  </div>
                  {app.email && (
                    <div className="mt-0.5 text-sm font-light text-muted-foreground">
                      Email: {app.email}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReviewAction(app.id, 'approve')}
                    disabled={processing[app.id]}
                    className="premium-btn bg-primary px-4 py-2 text-sm text-primary-foreground"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReviewAction(app.id, 'reject')}
                    disabled={processing[app.id]}
                    className="premium-btn border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed Applications: List of already reviewed applications */}
      {reviewedApplications.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-medium text-foreground">
            Reviewed Applications
          </h2>
          <div className="space-y-3">
            {reviewedApplications.map(app => (
              <div
                key={app.id}
                className="bg-card border border-border/40 rounded-2xl p-5 animate-fade-in-up"
              >
                <div className="flex items-center gap-3 mb-2">
                  <LinkFromCatalog
                    section="github"
                    link="userProfile"
                    params={{ username: app.githubUsername }}
                    className="text-base font-medium text-primary hover:underline"
                  >
                    @{app.githubUsername}
                  </LinkFromCatalog>
                  <span
                    className={cn(
                      'bounty-tag text-[11px]',
                      BETA_STATUS_CLASS_MAP[app.status] || 'bg-muted text-foreground/70 border border-border/40'
                    )}
                  >
                    {app.status}
                  </span>
                </div>
                <div className="text-sm font-light text-muted-foreground">
                  Applied: {formatDate(app.appliedAt)}
                </div>
                {app.reviewedAt && (
                  <div className="mt-0.5 text-sm font-light text-muted-foreground">
                    Reviewed: {formatDate(app.reviewedAt)}
                  </div>
                )}
                {app.email && (
                  <div className="mt-0.5 text-sm font-light text-muted-foreground">
                    Email: {app.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display message if there are no applications */}
      {applications.length === 0 && (
        <div className="rounded-2xl border border-border/40 bg-card p-16 text-center">
          <p className="text-base font-light text-muted-foreground">
            No applications yet
          </p>
        </div>
      )}
    </div>
  );
}

