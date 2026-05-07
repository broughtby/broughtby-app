import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { smsCampaignAPI } from '../services/api';
import './SmsCampaigns.css';

function formatDateRange(start, end) {
  if (!start && !end) return '—';
  const opts = { month: 'short', day: 'numeric' };
  const s = start ? new Date(start).toLocaleDateString(undefined, opts) : '';
  const e = end ? new Date(end).toLocaleDateString(undefined, opts) : '';
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

function StatusBadge({ status }) {
  const className = `sms-badge sms-badge-${status || 'draft'}`;
  return <span className={className}>{status || 'draft'}</span>;
}

const SmsCampaigns = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await smsCampaignAPI.list();
        if (mounted) setCampaigns(res.data.campaigns || []);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.response?.data?.error || 'Failed to load campaigns');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="sms-campaigns-container">
        <div className="sms-error">Admin access required.</div>
      </div>
    );
  }

  return (
    <div className="sms-campaigns-container">
      <div className="sms-breadcrumb">
        <Link to="/admin">Admin</Link>
        <span className="sep">/</span>
        <span className="current">SMS Campaigns</span>
      </div>

      <div className="sms-page-header">
        <h1>SMS Campaigns</h1>
        <Link to="/sms-campaigns/new" className="sms-btn sms-btn-primary">+ New Campaign</Link>
      </div>

      {error && <div className="sms-alert sms-alert-error">{error}</div>}

      {loading ? (
        <div className="sms-loading">Loading campaigns…</div>
      ) : campaigns.length === 0 ? (
        <div className="sms-card sms-card-padded">
          <div className="sms-empty">
            No campaigns yet. <Link to="/sms-campaigns/new">Create one</Link> to get started.
          </div>
        </div>
      ) : (
        <div className="sms-card">
          <table className="sms-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Brand</th>
                <th>Event code</th>
                <th>Status</th>
                <th>Photos</th>
                <th>Coupons</th>
                <th>Dates</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/sms-campaigns/${c.id}`)}>
                  <td>
                    <div className="strong">{c.name}</div>
                    <div className="muted" style={{ fontSize: '0.825rem' }}>
                      {c.twilio_number || '— number not assigned —'}
                    </div>
                  </td>
                  <td>{c.brand_company || c.brand_name || <span className="muted">—</span>}</td>
                  <td><code className="sms-code-pill">{c.event_code}</code></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.submission_count || <span className="muted">0</span>}</td>
                  <td>
                    {c.coupon_total > 0
                      ? `${c.coupon_assigned} / ${c.coupon_total}`
                      : <span className="muted">— / —</span>}
                  </td>
                  <td className="muted">{formatDateRange(c.active_start, c.active_end)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/sms-campaigns/${c.id}/edit`}
                      className="sms-btn sms-btn-ghost sms-btn-small"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <p className="muted" style={{ fontSize: '0.875rem', textAlign: 'center', color: 'var(--dark-gray)' }}>
          {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'} · sorted by most recent
        </p>
      )}
    </div>
  );
};

export default SmsCampaigns;
