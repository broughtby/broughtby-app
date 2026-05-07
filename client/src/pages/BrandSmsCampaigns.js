import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  return <span className={`sms-badge sms-badge-${status || 'draft'}`}>{status || 'draft'}</span>;
}

const BrandSmsCampaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <div className="sms-campaigns-container">
        <div className="sms-loading">Loading your campaigns…</div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const otherCampaigns = campaigns.filter(c => c.status !== 'active');

  return (
    <div className="sms-campaigns-container">
      <div className="sms-page-header">
        <div>
          <h1>My SMS Campaigns</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--dark-gray)' }}>
            Photos and submissions from your SMS campaigns.
          </p>
        </div>
      </div>

      {error && <div className="sms-alert sms-alert-error">{error}</div>}

      {campaigns.length === 0 ? (
        <div className="sms-card sms-card-padded">
          <div className="sms-empty">
            No campaigns yet. Once your account team sets one up, you'll see photos and stats here.
          </div>
        </div>
      ) : (
        <>
          {activeCampaigns.length > 0 && (
            <div className="sms-card">
              <div className="sms-card-section-header">
                <div>
                  <h2 style={{ margin: 0 }}>Active campaigns</h2>
                </div>
              </div>
              <table className="sms-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Event code</th>
                    <th>Photos</th>
                    <th>Coupons sent</th>
                    <th>Dates</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activeCampaigns.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/sms-campaigns/${c.id}`)}>
                      <td>
                        <div className="strong">{c.name}</div>
                        <div className="muted" style={{ fontSize: '0.825rem' }}>
                          <StatusBadge status={c.status} />
                        </div>
                      </td>
                      <td><code className="sms-code-pill">{c.event_code}</code></td>
                      <td>{c.submission_count || <span className="muted">0</span>}</td>
                      <td>
                        {c.coupon_total > 0
                          ? `${c.coupon_assigned} / ${c.coupon_total}`
                          : <span className="muted">— / —</span>}
                      </td>
                      <td className="muted">{formatDateRange(c.active_start, c.active_end)}</td>
                      <td className="text-right">
                        <Link
                          to={`/sms-campaigns/${c.id}`}
                          className="sms-btn sms-btn-primary sms-btn-small"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View photos
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {otherCampaigns.length > 0 && (
            <div className="sms-card">
              <div className="sms-card-section-header">
                <h2 style={{ margin: 0 }}>Past & upcoming</h2>
              </div>
              <table className="sms-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Event code</th>
                    <th>Status</th>
                    <th>Photos</th>
                    <th>Coupons sent</th>
                    <th>Dates</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {otherCampaigns.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/sms-campaigns/${c.id}`)}>
                      <td><div className="strong">{c.name}</div></td>
                      <td><code className="sms-code-pill">{c.event_code}</code></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.submission_count || <span className="muted">0</span>}</td>
                      <td>
                        {c.coupon_total > 0
                          ? `${c.coupon_assigned} / ${c.coupon_total}`
                          : <span className="muted">— / —</span>}
                      </td>
                      <td className="muted">{formatDateRange(c.active_start, c.active_end)}</td>
                      <td className="text-right">
                        <Link
                          to={`/sms-campaigns/${c.id}`}
                          className="sms-btn sms-btn-ghost sms-btn-small"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: '0.825rem', textAlign: 'center', color: 'var(--dark-gray)', marginTop: '2rem' }}>
        Phone numbers are masked here for privacy. Full data is available via CSV export from each campaign.
      </p>
    </div>
  );
};

export default BrandSmsCampaigns;
