'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, cn } from '@/shared/lib/utils';
import { getBetaApplications, reviewBetaApplication } from '@/shared/lib/api/beta';

export default function BetaAdminPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState({});
  const router = useRouter();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await getBetaApplications();
      setApplications(data.applications || []);
    } catch (err) {
      if (err?.status === 401) {
        router.push('/');
        return;
      }
      if (err?.status === 403) {
        setError('You do not have admin access');
        return;
      }
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (applicationId, action) => {
    setProcessing({ ...processing, [applicationId]: true });
    
    try {
      await reviewBetaApplication(applicationId, action);
      // Refresh applications list
      await fetchApplications();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing({ ...processing, [applicationId]: false });
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status !== 'pending');
  const badgeClassMap = {
    pending: 'bg-amber-100/70 text-amber-600',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-600',
  };

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

      {/* Stats */}
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

      {/* Pending Applications */}
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
                    <a
                      href={`https://github.com/${app.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium text-primary hover:underline"
                    >
                      @{app.githubUsername}
                    </a>
                    <span className={cn('bounty-tag text-[11px]', badgeClassMap[app.status] || 'bg-muted text-foreground/70')}>
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
                    onClick={() => handleReview(app.id, 'approve')}
                    disabled={processing[app.id]}
                    className="premium-btn bg-primary px-4 py-2 text-sm text-primary-foreground"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReview(app.id, 'reject')}
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

      {/* Reviewed Applications */}
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
                  <a
                    href={`https://github.com/${app.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-primary hover:underline"
                  >
                    @{app.githubUsername}
                  </a>
                  <span
                    className={cn('bounty-tag text-[11px]', badgeClassMap[app.status] || 'bg-muted text-foreground/70')}
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

