import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './PublicSubmission.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PublicSubmission = () => {
  const { eventCode } = useParams();

  const [campaign, setCampaign] = useState(null);
  const [campaignError, setCampaignError] = useState('');
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo is too large (max 10MB).');
      return;
    }
    setPhoto(file);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!photo) { setError('Please add a photo.'); return; }
    if (!phone.trim()) { setError('Please enter your phone number.'); return; }
    if (!consent) { setError('Please check the box to agree to the terms.'); return; }

    const formData = new FormData();
    formData.append('event_code', eventCode);
    formData.append('phone_number', phone.trim());
    formData.append('consent', 'true');
    formData.append('photo', photo);

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
            {photoPreview ? (
              <div className="ps-photo-preview">
                <img src={photoPreview} alt="Your submission" />
                <button
                  type="button"
                  className="ps-btn ps-btn-ghost ps-btn-small ps-change-btn"
                  onClick={handleClearPhoto}
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="ps-photo-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="ps-photo-icon">📸</span>
                <span>Tap to add a photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
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
