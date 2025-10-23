import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">BroughtBy</h1>
          <p className="hero-subtitle">
            The Premium Marketplace Connecting Brands with Vetted Brand Ambassadors
          </p>
          <p className="hero-description">
            Think of it like a dating app for business. Brands discover ambassadors, swipe to
            like, and when there's mutual interest, start meaningful conversations that lead to
            powerful partnerships.
          </p>
          <div className="hero-buttons">
            {isAuthenticated ? (
              <Link to="/discover" className="cta-button primary">
                Get Started
              </Link>
            ) : (
              <>
                <Link to="/register" className="cta-button primary">
                  Sign Up
                </Link>
                <Link to="/login" className="cta-button secondary">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">How It Works</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Create Your Profile</h3>
              <p>
                Brands and ambassadors create detailed profiles showcasing their expertise,
                rates, and availability.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💫</div>
              <h3>Smart Matching</h3>
              <p>
                Brands swipe through ambassador profiles. When interested, they like the
                profile. Ambassadors accept to create a match.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Real-Time Messaging</h3>
              <p>
                Once matched, chat in real-time to discuss partnerships, rates, and
                collaborations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="roles">
        <div className="container">
          <div className="roles-grid">
            <div className="role-card">
              <h3>For Brands</h3>
              <ul>
                <li>Discover vetted brand ambassadors</li>
                <li>View detailed profiles with rates and skills</li>
                <li>Swipe to find the perfect match</li>
                <li>Direct messaging with ambassadors</li>
                <li>Build authentic partnerships</li>
              </ul>
            </div>

            <div className="role-card">
              <h3>For Ambassadors</h3>
              <ul>
                <li>Get discovered by premium brands</li>
                <li>Showcase your expertise and portfolio</li>
                <li>Accept likes from interested brands</li>
                <li>Set your own rates and availability</li>
                <li>Expand your brand partnerships</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join BroughtBy today and start building meaningful brand partnerships.</p>
          {!isAuthenticated && (
            <Link to="/register" className="cta-button primary large">
              Create Your Account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
