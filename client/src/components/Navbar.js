import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const { logout, isAuthenticated, isAdmin, impersonateUser, user, demoMode, toggleDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Debug: Log admin status
  React.useEffect(() => {
    console.log('🔍 Navbar Debug:', {
      isAuthenticated,
      isAdmin,
      userEmail: user?.email,
      userIsAdmin: user?.isAdmin,
      user
    });
  }, [isAuthenticated, isAdmin, user]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Close dropdown and mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        // Don't close if clicking the hamburger button
        if (!event.target.closest('.hamburger-button')) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users with debounce
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await adminAPI.searchUsers(searchQuery);
        setSearchResults(response.data.users || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectUser = async (user) => {
    const result = await impersonateUser(user.id);
    if (result.success) {
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      navigate('/'); // Navigate to home after impersonation
    } else {
      alert(result.error || 'Failed to impersonate user');
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="navbar-brand">
          BroughtBy
        </Link>

        {/* Hamburger button - only visible on mobile */}
        <button
          className="hamburger-button"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`} ref={mobileMenuRef}>
          {isAuthenticated ? (
            <>
              <Link to="/discover" className="nav-link" onClick={closeMobileMenu}>
                Discover
              </Link>
              <Link to="/matches" className="nav-link" onClick={closeMobileMenu}>
                Matches
              </Link>
              <Link to="/calendar" className="nav-link" onClick={closeMobileMenu}>
                Calendar
              </Link>
              <Link to="/messages" className="nav-link" onClick={closeMobileMenu}>
                Messages
              </Link>
              <Link to="/profile" className="nav-link" onClick={closeMobileMenu}>
                Profile
              </Link>

              {/* Admin User Switcher - Only visible to admins */}
              {isAdmin && (
                <div className="admin-switcher" ref={dropdownRef}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="admin-search-input"
                  />
                  {showDropdown && (searchQuery.trim().length >= 2 || searchResults.length > 0) && (
                    <div className="admin-dropdown">
                      {isSearching ? (
                        <div className="admin-dropdown-item loading">
                          Searching...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="admin-dropdown-item"
                            onClick={() => handleSelectUser(user)}
                          >
                            <div className="user-info">
                              {user.profile_photo ? (
                                <img
                                  src={user.profile_photo}
                                  alt={user.name}
                                  className="user-avatar"
                                />
                              ) : (
                                <div className="user-avatar-placeholder">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="user-details">
                                <div className="user-name">{user.name}</div>
                                <div className="user-email">{user.email}</div>
                              </div>
                            </div>
                            <div className="user-role-badge">{user.role}</div>
                          </div>
                        ))
                      ) : searchQuery.trim().length >= 2 ? (
                        <div className="admin-dropdown-item no-results">
                          No users found
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Demo Mode Toggle - Only visible to admins */}
              {isAdmin && (
                <button
                  onClick={toggleDemoMode}
                  className={`demo-mode-toggle ${demoMode ? 'active' : ''}`}
                  title={demoMode ? 'Turn off demo mode' : 'Turn on demo mode'}
                  aria-label={demoMode ? 'Turn off demo mode' : 'Turn on demo mode'}
                >
                  <span className="demo-icon" role="img" aria-label="Camera">
                    🎬
                  </span>
                </button>
              )}

              <button onClick={handleLogout} className="nav-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={closeMobileMenu}>
                Login
              </Link>
              <Link to="/register" className="nav-button-link" onClick={closeMobileMenu}>
                <button className="nav-button">Sign Up</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
