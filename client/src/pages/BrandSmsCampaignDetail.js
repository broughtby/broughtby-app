import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { smsCampaignAPI } from '../services/api';
import './SmsCampaigns.css';

function timeAgo(date) {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatusBadge({ status }) {
  return <span className={`sms-badge sms-badge-${status || 'draft'}`}>{status || 'draft'}</span>;
}

const BrandSmsCampaignDetail = () => {
  const { id } = useParams();

  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState({});
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('gallery');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignRes, submissionsRes] = await Promise.all([
        smsCampaignAPI.get(id),
        smsCampaignAPI.listSubmissions(id),
      ]);
      setCampaign(campaignRes.data.campaign);
      setStats(campaignRes.data.stats || {});
      setSubmissions(submissionsRes.data.submissions || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleExport = () => {
    const url = smsCampaignAPI.exportCsvUrl(id);
    const token = localStorage.getItem('token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Export failed');
        return r.blob();
      })
      .then((blob) => {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `submissions-${campaign?.event_code || 'campaign'}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch((err) => {
        console.error(err);
        setError('Export failed');
      });
  };

  if (loading) {
    return (
      <div className="sms-campaigns-container">
        <div className="sms-loading">Loading campaign…</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="sms-campaigns-container">
        <div className="sms-error">{error || 'Campaign not found'}</div>
      </div>
    );
  }

  const submissionCount = parseInt(stats.submission_count, 10) || 0;
  const couponAssigned = parseInt(stats.coupon_assigned, 10) || 0;
  const couponTotal = parseInt(stats.coupon_total, 10) || 0;
  const uniquePhoneCount = parseInt(stats.unique_phone_count, 10) || 0;

  return (
    <div className="sms-campaigns-container">
      <div className="sms-breadcrumb">
        <Link to="/sms-campaigns">SMS Campaigns</Link>
        <span className="sep">/</span>
        <span className="current">{campaign.name}</span>
      </div>

      <div className="sms-page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {campaign.name}
            <StatusBadge status={campaign.status} />
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--dark-gray)' }}>
            Event code <code className="sms-code-pill">{campaign.event_code}</code>
            {campaign.event_venue && ` · ${campaign.event_venue}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button onClick={handleExport} className="sms-btn sms-btn-secondary">Export CSV</button>
        </div>
      </div>

      {error && <div className="sms-alert sms-alert-error">{error}</div>}

      {/* Stats */}
      <div className="sms-stats-grid">
        <div className="sms-stat-card accent">
          <div className="sms-stat-label">Photos received</div>
          <div className="sms-stat-value">{submissionCount}</div>
          <div className="sms-stat-sub">{couponAssigned} coupons sent</div>
        </div>
        <div className="sms-stat-card">
          <div className="sms-stat-label">Coupons sent</div>
          <div className="sms-stat-value">{couponAssigned}</div>
          <div className="sms-stat-sub">of {couponTotal}</div>
        </div>
        <div className="sms-stat-card">
          <div className="sms-stat-label">Unique participants</div>
          <div className="sms-stat-value">{uniquePhoneCount}</div>
        </div>
        <div className="sms-stat-card">
          <div className="sms-stat-label">Last submission</div>
          <div className="sms-stat-value small">{stats.last_submission_at ? timeAgo(stats.last_submission_at) : '—'}</div>
        </div>
      </div>

      {/* Submissions */}
      <div className="sms-card sms-card-padded">
        <div className="sms-flex" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>Photos</h2>
          <div className="spacer" />
          <div className="sms-tabs">
            <button className={tab === 'gallery' ? 'active' : ''} onClick={() => setTab('gallery')}>Gallery</button>
            <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>Table</button>
          </div>
          <span className="muted" style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
            {submissions.length} {submissions.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="sms-empty">No submissions yet. Once customers text the campaign number, photos will appear here.</div>
        ) : tab === 'gallery' ? (
          <div className="sms-photo-grid">
            {submissions.map((s) => (
              <a
                key={s.id}
                href={s.media_url || '#'}
                target={s.media_url ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="sms-photo-card"
                onClick={(e) => { if (!s.media_url) e.preventDefault(); }}
              >
                {s.media_url ? (
                  <img src={s.media_url} alt="submission" loading="lazy" />
                ) : (
                  <div className="sms-photo-placeholder">photo unavailable</div>
                )}
                <div className="sms-photo-overlay">
                  <span className="phone">{new Date(s.submitted_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sms-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Photo</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.media_url ? (
                        <a href={s.media_url} target="_blank" rel="noopener noreferrer">
                          <img src={s.media_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted">{new Date(s.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.825rem', textAlign: 'center', color: 'var(--dark-gray)', marginTop: '1rem' }}>
        Phone numbers are masked here for privacy. Full data is available via CSV export.
      </p>
    </div>
  );
};

export default BrandSmsCampaignDetail;
