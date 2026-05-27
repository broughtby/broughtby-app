import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './PublicSubmission.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PublicSubmission = () => {
  const { eventCode } = useParams();

  const [campaign, setCampaign] = useState(null);
  const [campaignError, setCampaignError] = useState('');
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  // Array of { file, preview } objects (one per selected photo)
  const [photos, setPhotos] = useState([]);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  // Load campaign info on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/campaigns/${eventCode}`);
        const data = await res.json();
        if (!mounted) return;
        if (res.ok) {
          setCampaign(data);
        } else {
          setCampaignError(data.error || 'This event is not available');
        }
      } catch (err) {
        if (mounted) setCampaignError('Could not load event info');
      } finally {
        if (mounted) setLoadingCampaign(false);
      }
    })();
    return () => { mounted = false; };
  }, [eventCode]);

  const MAX_PHOTOS = 5;
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;

  const handleFilesChange = async (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    setError('');

    // Filter oversized
    const ok = incoming.filter(f => {
      if (f.size > MAX_SIZE_BYTES) {
        setError(`"${f.name}" is too large (max 10MB).`);
        return false;
      }
      return true;
    });

    // Cap total to MAX_PHOTOS
    const remainingSlots = MAX_PHOTOS - photos.length;
    const accepted = ok.slice(0, remainingSlots);
    if (ok.length > remainingSlots) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
    }

    // Generate previews
    const newEntries = await Promise.all(accepted.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve({ file, preview: ev.target.result });
      reader.readAsDataURL(file);
    })));

    setPhotos(prev => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (photos.length === 0) { setError('Please add at least one photo.'); return; }
    if (!phone.trim()) { setError('Please enter your phone number.'); return; }
    if (!consent) { setError('Please check the box to agree to the terms.'); return; }

    const formData = new FormData();
    formData.append('event_code', eventCode);
    formData.append('phone_number', phone.trim());
    formData.append('consent', 'true');
    photos.forEach(({ file }) => formData.append('photos', file));

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/submissions`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ code: data.code, alreadyClaimed: false });
      } else if (data.already_claimed && data.code) {
        setResult({ code: data.code, alreadyClaimed: true });
      } else {
        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (!result?.code) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(result.code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  // Loading
  if (loadingCampaign) {
    return (
      <div className="ps-container">
        <div className="ps-card">
          <div className="ps-loading">Loading…</div>
        </div>
      </div>
    );
  }

  // Campaign not available
  if (campaignError) {
    return (
      <div className="ps-container">
        <div className="ps-card">
          <h1>Event not available</h1>
          <p className="ps-subtle">{campaignError}</p>
          <p className="ps-subtle" style={{ marginTop: '1rem' }}>
            If you think this is wrong, ask the team at the event for help.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (result) {
    return (
      <div className="ps-container">
        <div className="ps-card ps-success">
          <div className="ps-celebrate">🍷</div>
          <h1>{result.alreadyClaimed ? 'Already claimed' : "Here's your code!"}</h1>
          {result.alreadyClaimed && (
            <p className="ps-subtle">You already grabbed a code for this event — here it is again.</p>
          )}
          <div className="ps-code-display">
            <code>{result.code}</code>
            <button
              type="button"
              onClick={copyCode}
              className="ps-btn ps-btn-ghost ps-btn-small"
            >
              {copied ? 'Copied ✓' : 'Copy code'}
            </button>
          </div>
          <p className="ps-subtle">
            Save this code — refresh the page and it's gone. Use it at checkout on {campaign.brand_name}'s site.
          </p>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="ps-container">
      <div className="ps-card">
        <div className="ps-brand">{campaign.brand_name}</div>
        <h1>Snap a pic, get your code</h1>
        <p className="ps-subhead">
          {campaign.event_venue || campaign.name}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="ps-photo-upload">
            {photos.length === 0 ? (
              <button
                type="button"
                className="ps-photo-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="ps-photo-icon">📸</span>
                <span>Tap to add photos</span>
                <span className="ps-photo-meta">Up to {MAX_PHOTOS}</span>
              </button>
            ) : (
              <div className="ps-photo-grid">
                {photos.map((p, idx) => (
                  <div key={idx} className="ps-photo-thumb">
                    <img src={p.preview} alt={`Submission ${idx + 1}`} />
                    <button
                      type="button"
                      className="ps-photo-remove"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    className="ps-photo-add"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span style={{ fontSize: '1.75rem' }}>+</span>
                    <span style={{ fontSize: '0.75rem' }}>Add more</span>
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFilesChange}
            />
          </div>

          <div className="ps-field">
            <label htmlFor="ps-phone">Phone number</label>
            <input
              id="ps-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 555-5555"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="ps-checkbox">
            <input
              id="ps-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <label htmlFor="ps-consent">
              I agree my photo may be used by {campaign.brand_name} for marketing,
              and to receive marketing communications. Msg/data rates may apply.
            </label>
          </div>

          {error && <div className="ps-error">{error}</div>}

          <button
            type="submit"
            className="ps-btn ps-btn-primary ps-btn-large"
            disabled={submitting}
          >
            {submitting ? 'Sending…' : 'Get my code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicSubmission;
