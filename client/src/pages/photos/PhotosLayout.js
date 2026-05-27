import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './photos.css';

// Layout wrapper for all /photos/* routes. Standalone BroughtBy Photos
// branding — does NOT show the BroughtBy ambassador navbar.
const PhotosLayout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/photos');
  };

  const onCampaignsRoute = location.pathname.startsWith('/photos/campaigns');

  return (
    <div className="photos-app">
      <nav className="photos-navbar">
        <Link to={isAuthenticated ? '/photos/campaigns' : '/photos'} className="photos-logo">
          <span className="photos-logo-mark">●</span>
          <span>BroughtBy <strong>Photos</strong></span>
        </Link>

        <div className="photos-nav-links">
          {isAuthenticated ? (
            <>
              <Link
                to="/photos/campaigns"
                className={`photos-nav-link ${onCampaignsRoute ? 'active' : ''}`}
              >
                Campaigns
              </Link>
              <div className="photos-account" ref={menuRef}>
                <button
                  className="photos-account-btn"
                  onClick={() => setMenuOpen(v => !v)}
                  type="button"
                >
                  {user?.company_name || user?.name || user?.email}
                  <span className="photos-caret">▾</span>
                </button>
                {menuOpen && (
                  <div className="photos-account-menu">
                    <div className="photos-account-email">{user?.email}</div>
                    <button onClick={handleLogout}>Log out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/photos/login" className="photos-nav-link">Log in</Link>
              <Link to="/photos/signup" className="photos-btn photos-btn-primary photos-btn-small">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {children}
    </div>
  );
};

export default PhotosLayout;
