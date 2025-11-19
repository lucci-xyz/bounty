'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'approved':
        return '#00827B';
      case 'rejected':
        return '#ff3b30';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status !== 'pending');

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: '600', 
          color: '#00827B',
          marginBottom: '32px'
        }}>
          Beta Access Management
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: '600', 
          color: '#00827B',
          marginBottom: '32px'
        }}>
          Beta Access Management
        </h1>
        <div style={{
          padding: '20px',
          background: 'rgba(255, 59, 48, 0.1)',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          borderRadius: '12px',
          color: '#ff3b30'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: '600', 
          color: '#00827B',
          marginBottom: '8px'
        }}>
          Beta Access Management
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Review and manage beta access applications
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '20px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Total Applications
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: 'var(--color-text)' }}>
            {applications.length}
          </div>
        </div>
        <div style={{
          padding: '20px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#FFA500' }}>
            {pendingApplications.length}
          </div>
        </div>
        <div style={{
          padding: '20px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Approved
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#00827B' }}>
            {applications.filter(app => app.status === 'approved').length}
          </div>
        </div>
        <div style={{
          padding: '20px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Rejected
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#ff3b30' }}>
            {applications.filter(app => app.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--color-text)',
            marginBottom: '16px'
          }}>
            Pending Applications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingApplications.map(app => (
              <div
                key={app.id}
                style={{
                  padding: '20px',
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <a
                      href={`https://github.com/${app.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--color-primary)',
                        textDecoration: 'none'
                      }}
                    >
                      @{app.githubUsername}
                    </a>
                    <span
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(255, 165, 0, 0.1)',
                        color: '#FFA500',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}
                    >
                      {app.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    Applied: {formatDate(app.appliedAt)}
                  </div>
                  {app.email && (
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      Email: {app.email}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleReview(app.id, 'approve')}
                    disabled={processing[app.id]}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: processing[app.id] ? 'var(--color-background-secondary)' : 'var(--color-primary)',
                      color: processing[app.id] ? 'var(--color-text-secondary)' : 'white',
                      cursor: processing[app.id] ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!processing[app.id]) {
                        e.currentTarget.style.background = 'var(--color-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!processing[app.id]) {
                        e.currentTarget.style.background = 'var(--color-primary)';
                      }
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReview(app.id, 'reject')}
                    disabled={processing[app.id]}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-secondary)',
                      cursor: processing[app.id] ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!processing[app.id]) {
                        e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)';
                        e.currentTarget.style.borderColor = '#ff3b30';
                        e.currentTarget.style.color = '#ff3b30';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!processing[app.id]) {
                        e.currentTarget.style.background = 'var(--color-background)';
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }
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

      {/* Reviewed Applications */}
      {reviewedApplications.length > 0 && (
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--color-text)',
            marginBottom: '16px'
          }}>
            Reviewed Applications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviewedApplications.map(app => (
              <div
                key={app.id}
                style={{
                  padding: '20px',
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <a
                    href={`https://github.com/${app.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'var(--color-primary)',
                      textDecoration: 'none'
                    }}
                  >
                    @{app.githubUsername}
                  </a>
                  <span
                    style={{
                      padding: '4px 10px',
                      background: `${getStatusColor(app.status)}15`,
                      color: getStatusColor(app.status),
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}
                  >
                    {app.status}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  Applied: {formatDate(app.appliedAt)}
                </div>
                {app.reviewedAt && (
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Reviewed: {formatDate(app.reviewedAt)}
                  </div>
                )}
                {app.email && (
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Email: {app.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px'
        }}>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
            No applications yet
          </p>
        </div>
      )}
    </div>
  );
}

