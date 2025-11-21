'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStatusColor, formatDate } from '@/shared/lib/utils';

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
      const res = await fetch('/api/beta/applications');
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        if (res.status === 403) {
          throw new Error('You do not have admin access');
        }
        throw new Error('Failed to fetch applications');
      }
      
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (applicationId, action) => {
    setProcessing({ ...processing, [applicationId]: true });
    
    try {
      const res = await fetch('/api/beta/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ applicationId, action })
      });
      
      if (!res.ok) {
        throw new Error('Failed to review application');
      }
      
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

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 24px' }}>
        <h1 className="text-foreground mb-2" style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '500', letterSpacing: '-0.02em' }}>
          Beta Access Management
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: '14px', fontWeight: '300' }}>Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 24px' }}>
        <h1 className="text-foreground mb-8" style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '500', letterSpacing: '-0.02em' }}>
          Beta Access Management
        </h1>
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '40px 24px' }}>
      <div className="mb-8">
        <h1 className="text-foreground mb-2" style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '500', letterSpacing: '-0.02em' }}>
          Beta Access Management
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: '14px', fontWeight: '300' }}>
          Review and manage beta access applications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card animate-fade-in-up delay-100">
          <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Total Applications
          </div>
          <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
            {applications.length}
          </div>
        </div>
        <div className="stat-card animate-fade-in-up delay-200">
          <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em', color: '#FFA500' }}>
            {pendingApplications.length}
          </div>
        </div>
        <div className="stat-card animate-fade-in-up delay-300">
          <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Approved
          </div>
          <div style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em', color: 'var(--primary)' }}>
            {applications.filter(app => app.status === 'approved').length}
          </div>
        </div>
        <div className="stat-card animate-fade-in-up delay-400">
          <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Rejected
          </div>
          <div style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em', color: 'var(--destructive)' }}>
            {applications.filter(app => app.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div className="mb-8">
          <h2 className="text-foreground mb-4" style={{ fontSize: '18px', fontWeight: '400' }}>
            Pending Applications
          </h2>
          <div className="space-y-3">
            {pendingApplications.map(app => (
              <div
                key={app.id}
                className="bg-card border border-border/40 rounded-2xl p-5 flex justify-between items-center gap-5 animate-fade-in-up"
              >
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-3 mb-2">
                    <a
                      href={`https://github.com/${app.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      style={{ fontSize: '16px', fontWeight: '400', textDecoration: 'none' }}
                    >
                      @{app.githubUsername}
                    </a>
                    <span className="bounty-tag" style={{ background: 'rgba(255, 165, 0, 0.1)', color: '#FFA500', fontSize: '11px' }}>
                      {app.status}
                    </span>
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300' }}>
                    Applied: {formatDate(app.appliedAt)}
                  </div>
                  {app.email && (
                    <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300', marginTop: '2px' }}>
                      Email: {app.email}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(app.id, 'approve')}
                    disabled={processing[app.id]}
                    className="premium-btn bg-primary text-primary-foreground"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReview(app.id, 'reject')}
                    disabled={processing[app.id]}
                    className="premium-btn"
                    style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
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
          <h2 className="text-foreground mb-4" style={{ fontSize: '18px', fontWeight: '400' }}>
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
                    className="text-primary hover:underline"
                    style={{ fontSize: '16px', fontWeight: '400', textDecoration: 'none' }}
                  >
                    @{app.githubUsername}
                  </a>
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
                <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300' }}>
                  Applied: {formatDate(app.appliedAt)}
                </div>
                {app.reviewedAt && (
                  <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300', marginTop: '2px' }}>
                    Reviewed: {formatDate(app.reviewedAt)}
                  </div>
                )}
                {app.email && (
                  <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300', marginTop: '2px' }}>
                    Email: {app.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-16 text-center">
          <p className="text-muted-foreground" style={{ fontSize: '16px', fontWeight: '300' }}>
            No applications yet
          </p>
        </div>
      )}
    </div>
  );
}

