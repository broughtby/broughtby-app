import React from 'react';
import { Link } from 'react-router-dom';
import './photos.css';

const PhotosLanding = () => {
  return (
    <div className="photos-landing">
      <div className="photos-hero">
        <div className="photos-hero-eyebrow">BroughtBy Photos</div>
        <h1>Turn an event into a content library — and a marketing list.</h1>
        <p>
          A photo-for-coupon flow your customers run themselves. Scan, snap, redeem.
          You keep the photos, the consented emails, and the attribution.
        </p>
        <div className="photos-hero-cta">
          <Link to="/photos/signup" className="photos-btn photos-btn-primary photos-btn-large">
            Get started — free pilot
          </Link>
          <Link to="/photos/login" className="photos-btn photos-btn-secondary photos-btn-large">
            Log in
          </Link>
        </div>
      </div>

      <div className="photos-feature-grid">
        <div className="photos-feature">
          <div className="photos-feature-icon">📸</div>
          <h3>Capture content</h3>
          <p>
            Every guest who participates uploads photos of themselves with your product.
            User-generated marketing assets, with explicit usage rights.
          </p>
        </div>
        <div className="photos-feature">
          <div className="photos-feature-icon">✉️</div>
          <h3>Build your list</h3>
          <p>
            Every submission is opted-in to marketing. Walk away from each event with
            a list of fans you can email later.
          </p>
        </div>
        <div className="photos-feature">
          <div className="photos-feature-icon">🎟️</div>
          <h3>Drive redemptions</h3>
          <p>
            Reward participants with a discount code. Track who scanned, who claimed,
            and (with your DTC) who redeemed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotosLanding;
