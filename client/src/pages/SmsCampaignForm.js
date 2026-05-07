import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { smsCampaignAPI, adminAPI } from '../services/api';
import './SmsCampaigns.css';

const DEFAULT_CONSENT = "Thanks for your photo! 🍷 Your code: [CODE] — redeem at the brand's site. By texting, you agree your photo may be used by the brand and BroughtBy for marketing. Msg/data rates apply. Reply STOP to opt out, HELP for help.";
const DEFAULT_ALREADY_CLAIMED = "You've already claimed code [CODE] for this event.";
const DEFAULT_OUT_OF_CODES = "We're temporarily out of codes for this event! We'll reach out shortly.";

function emptyForm() {
  return {
    brand_id: '',
    name: '',
    event_code: '',
    event_venue: '',
    twilio_number: '',
    active_start: '',
    active_end: '',
    consent_message_template: DEFAULT_CONSENT,
    already_claimed_message_template: DEFAULT_ALREADY_CLAIMED,
    out_of_codes_message_template: DEFAULT_OUT_OF_CODES,
    status: 'draft',
  };
}

// Convert ISO timestamp from API to "yyyy-MM-ddTHH:mm" for datetime-local inputs
function toDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SmsCampaignForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm());
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [couponPool, setCouponPool] = useState({ total: 0, available: 0, assigned: 0 });
  const [couponUploading, setCouponUploading] = useState(false);
  const [couponUploadResult, setCouponUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // Load brands for the dropdown
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await adminAPI.getAllUsersWithStatus('brand');
        setBrands(res.data.users || []);
      } catch (err) {
        console.error('Failed to load brands:', err);
      }
    })();
  }, [isAdmin]);

  // Load campaign if editing
  useEffect(() => {
    if (!isEdit || !isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [campaignRes, poolRes] = await Promise.all([
          smsCampaignAPI.get(id),
          smsCampaignAPI.getCouponPool(id),
        ]);
        if (!mounted) return;
        const c = campaignRes.data.campaign;
        setForm({
          brand_id: c.brand_id || '',
          name: c.name || '',
          event_code: c.event_code || '',
          event_venue: c.event_venue || '',
          twilio_number: c.twilio_number || '',
          active_start: toDateTimeLocal(c.active_start),
          active_end: toDateTimeLocal(c.active_end),
          consent_message_template: c.consent_message_template || DEFAULT_CONSENT,
          already_claimed_message_template: c.already_claimed_message_template || DEFAULT_ALREADY_CLAIMED,
          out_of_codes_message_template: c.out_of_codes_message_template || DEFAULT_OUT_OF_CODES,
          status: c.status || 'draft',
        });
        setCouponPool(poolRes.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to load campaign');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, isEdit, isAdmin]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const buildPayload = () => {
    const payload = { ...form };
    payload.brand_id = parseInt(payload.brand_id, 10);
    // Empty strings → null for optional dates / fields
    if (!payload.active_start) payload.active_start = null;
    if (!payload.active_end) payload.active_end = null;
    if (!payload.event_venue) payload.event_venue = null;
    return payload;
  };

  const handleSave = async (newStatus) => {
    setError('');
    setSuccess('');
    if (!form.brand_id || !form.name || !form.event_code || !form.twilio_number) {
      setError('Brand, name, event code, and Twilio number are required.');
      return;
    }

    const payload = buildPayload();
    if (newStatus) payload.status = newStatus;

    setSaving(true);
    try {
      let savedId;
      if (isEdit) {
        await smsCampaignAPI.update(id, payload);
        savedId = id;
        setSuccess('Campaign saved.');
      } else {
        const res = await smsCampaignAPI.create(payload);
        savedId = res.data.campaign.id;
        navigate(`/sms-campaigns/${savedId}/edit`, { replace: true });
        setSuccess('Campaign created. Upload coupon codes below.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelected = async (file) => {
    setError('');
    setCouponUploadResult(null);

    const text = await file.text();
    const codes = text
      .split(/\r?\n/)
      .map((line) => line.split(',')[0].trim())
      .filter(Boolean);

    if (codes.length === 0) {
      setError('No valid codes found in CSV.');
      return;
    }
    if (codes.length > 10000) {
      setError('Maximum 10,000 codes per upload.');
      return;
    }

    setCouponUploading(true);
    try {
      const res = await smsCampaignAPI.uploadCoupons(id, codes);
      setCouponUploadResult({ filename: file.name, ...res.data });
      setCouponPool({
        total: res.data.total,
        available: res.data.available,
        assigned: res.data.total - res.data.available,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Coupon upload failed');
    } finally {
      setCouponUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isAdmin) {
    return (
      <div className="sms-campaigns-container">
        <div className="sms-error">Admin access required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sms-campaigns-container">
        <div className="sms-loading">Loading campaign…</div>
      </div>
    );
  }

  return (
    <div className="sms-campaigns-container">
      <div className="sms-breadcrumb">
        <Link to="/admin">Admin</Link>
        <span className="sep">/</span>
        <Link to="/sms-campaigns">SMS Campaigns</Link>
        <span className="sep">/</span>
        <span className="current">{isEdit ? form.name || 'Edit' : 'New campaign'}</span>
      </div>

      <div className="sms-page-header">
        <h1>{isEdit ? `Edit: ${form.name || 'Campaign'}` : 'New SMS Campaign'}</h1>
      </div>

      {error && <div className="sms-alert sms-alert-error">{error}</div>}
      {success && <div className="sms-alert sms-alert-success">{success}</div>}

      <div className="sms-card sms-card-padded">
        <h2>Campaign details</h2>

        <div className="sms-form-row">
          <div className="sms-form-group">
            <label>Brand *</label>
            <select value={form.brand_id} onChange={handleChange('brand_id')}>
              <option value="">— select brand —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.company_name ? `${b.company_name} (${b.name})` : b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sms-form-group">
            <label>Status</label>
            <select value={form.status} onChange={handleChange('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
            <span className="helper-text">Only active campaigns receive texts.</span>
          </div>
        </div>

        <div className="sms-form-group">
          <label>Campaign name *</label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="e.g. Three Cities Social Club"
          />
          <span className="helper-text">Internal label only — not shown to customers.</span>
        </div>

        <div className="sms-form-row">
          <div className="sms-form-group">
            <label>Event code *</label>
            <input
              type="text"
              value={form.event_code}
              onChange={handleChange('event_code')}
              placeholder="e.g. 3CITIES"
              style={{ textTransform: 'uppercase' }}
            />
            <span className="helper-text">Used in coupon code prefix and analytics tags.</span>
          </div>
          <div className="sms-form-group">
            <label>Event venue</label>
            <input
              type="text"
              value={form.event_venue}
              onChange={handleChange('event_venue')}
              placeholder="e.g. Three Cities Social Club, Atlanta GA"
            />
          </div>
        </div>

        <div className="sms-form-group">
          <label>Twilio phone number *</label>
          <input
            type="tel"
            value={form.twilio_number}
            onChange={handleChange('twilio_number')}
            placeholder="+15554102024"
          />
          <span className="helper-text">
            E.164 format with leading <code>+</code> and country code. Inbound MMS to this number routes to this campaign.
          </span>
        </div>

        <div className="sms-form-row">
          <div className="sms-form-group">
            <label>Active start</label>
            <input
              type="datetime-local"
              value={form.active_start}
              onChange={handleChange('active_start')}
            />
          </div>
          <div className="sms-form-group">
            <label>Active end</label>
            <input
              type="datetime-local"
              value={form.active_end}
              onChange={handleChange('active_end')}
            />
          </div>
        </div>
      </div>

      <div className="sms-card sms-card-padded">
        <h2>Message templates</h2>
        <div className="sms-template-hint">
          Use <code>[CODE]</code> as a placeholder for the assigned coupon code.
        </div>

        <div className="sms-form-group">
          <label>First-time reply (includes consent language)</label>
          <textarea
            value={form.consent_message_template}
            onChange={handleChange('consent_message_template')}
            rows={4}
          />
          <span className="helper-text">Sent on the first text from a phone number. Aim for ~280 chars.</span>
        </div>

        <div className="sms-form-group">
          <label>Already-claimed reply</label>
          <textarea
            value={form.already_claimed_message_template}
            onChange={handleChange('already_claimed_message_template')}
            rows={2}
          />
          <span className="helper-text">Sent if the same phone texts again after already getting a code.</span>
        </div>

        <div className="sms-form-group">
          <label>Out-of-codes reply</label>
          <textarea
            value={form.out_of_codes_message_template}
            onChange={handleChange('out_of_codes_message_template')}
            rows={2}
          />
          <span className="helper-text">Sent when the coupon pool is exhausted. Triggers an email alert to admin.</span>
        </div>
      </div>

      <div className="sms-card sms-card-padded">
        <h2>Coupon codes {isEdit && couponPool.total > 0 && (
          <span style={{ fontSize: '0.85rem', color: 'var(--dark-gray)', fontWeight: 400, marginLeft: '0.75rem' }}>
            {couponPool.available} available · {couponPool.assigned} assigned · {couponPool.total} total
          </span>
        )}</h2>

        {!isEdit ? (
          <div className="sms-upload-disabled">
            Save the campaign first to upload coupon codes.
          </div>
        ) : (
          <>
            <div className="sms-upload-box">
              <div className="sms-upload-icon">📄</div>
              <div><strong>Upload CSV of coupon codes</strong></div>
              <div className="sms-upload-meta">
                One code per line · UTF-8 · max 10,000 codes per file
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              />
              <button
                type="button"
                className="sms-btn sms-btn-secondary"
                style={{ marginTop: '0.75rem' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={couponUploading}
              >
                {couponUploading ? 'Uploading…' : 'Choose file'}
              </button>
            </div>

            {couponUploadResult && (
              <div className="sms-upload-success">
                <strong>{couponUploadResult.filename}</strong> · {couponUploadResult.inserted} codes added
                {couponUploadResult.skipped > 0 && ` · ${couponUploadResult.skipped} duplicates skipped`}
              </div>
            )}

            <p className="helper-text" style={{ marginTop: '1rem' }}>
              Codes will be assigned in upload order. You can append more codes at any time.
            </p>
          </>
        )}
      </div>

      <div className="sms-form-actions">
        <Link to="/sms-campaigns" className="sms-btn sms-btn-ghost">Cancel</Link>
        <button
          type="button"
          className="sms-btn sms-btn-secondary"
          onClick={() => handleSave('draft')}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save as draft'}
        </button>
        <button
          type="button"
          className="sms-btn sms-btn-primary"
          onClick={() => handleSave('active')}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save & activate'}
        </button>
      </div>
    </div>
  );
};

export default SmsCampaignForm;
