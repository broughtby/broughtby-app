import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const { logout, isAuthenticated, isAdmin, impersonateUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
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

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <Link to="/discover" className="nav-link">
                Discover
              </Link>
              <Link to="/matches" className="nav-link">
                Matches
              </Link>
              <Link to="/calendar" className="nav-link">
                Calendar
              </Link>
              <Link to="/profile" className="nav-link">
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

              <button onClick={handleLogout} className="nav-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="nav-button-link">
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
