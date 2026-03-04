// Admin dashboard with user status overview
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import './Admin.css';

const Admin = () => {
  const { isAdmin } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const filterRole = roleFilter === 'all' ? undefined : roleFilter;
      const response = await adminAPI.getAllUsersWithStatus(filterRole);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemoData = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to reset demo data?\n\n' +
      'This will clear all test account bookings, messages, and interactions.\n\n' +
      'Your profile will be preserved, but the following will be deleted:\n' +
      '• All messages\n' +
      '• All bookings\n' +
      '• All matches\n' +
      '• All likes\n' +
      '• All passes\n\n' +
      'This action CANNOT be undone.'
    );

    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setError('');
    setSuccess('');

    try {
      // Get current user ID from auth context
      const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
      const response = await adminAPI.resetDemoData(currentUserId);

      if (response.data.success) {
        const { deleted } = response.data;
        setSuccess(
          `Demo data reset successfully! Deleted: ${deleted.messages} messages, ` +
          `${deleted.bookings} bookings, ${deleted.matches} matches, ` +
          `${deleted.likes} likes, ${deleted.passes} passes.`
        );
      }
    } catch (error) {
      console.error('Reset demo data error:', error);
      setError(
        error.response?.data?.error ||
        'Failed to reset demo data. Please try again or contact support.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  const StatusBadge = ({ label, active, tooltip }) => {
    if (!active) return null;
    return (
      <span className="status-badge" title={tooltip}>
        {label}
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="error-message">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* User Status Section */}
      <div className="user-status-section">
        <div className="section-header">
          <h2>User Status Overview (v2)</h2>
          <div className="role-filter">
            <button
              className={roleFilter === 'all' ? 'active' : ''}
              onClick={() => setRoleFilter('all')}
            >
              All Users
            </button>
            <button
              className={roleFilter === 'brand' ? 'active' : ''}
              onClick={() => setRoleFilter('brand')}
            >
              Brands
            </button>
            <button
              className={roleFilter === 'ambassador' ? 'active' : ''}
              onClick={() => setRoleFilter('ambassador')}
            >
              Ambassadors
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status Flags</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      {user.company_name && (
                        <div className="company-name">{user.company_name}</div>
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className="status-flags">
                        <StatusBadge
                          label="Admin"
                          active={user.status.isAdmin}
                          tooltip="Has admin privileges - can impersonate users and manage system"
                        />
                        <StatusBadge
                          label="Test"
                          active={user.status.isTest}
                          tooltip="Test/demo account for development purposes"
                        />
                        <StatusBadge
                          label="Preview"
                          active={user.status.isPreview}
                          tooltip="YC preview brand account for demonstrations"
                        />
                        <StatusBadge
                          label="Preview BA"
                          active={user.status.isPreviewAmbassador}
                          tooltip="Test brand ambassador for preview brands (only one allowed)"
                        />
                        {!user.status.isActive && (
                          <StatusBadge
                            label="Inactive"
                            active={true}
                            tooltip="Account is deactivated"
                          />
                        )}
                      </div>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="empty-state">
                No {roleFilter !== 'all' ? roleFilter + 's' : 'users'} found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Tools Section */}
      <div className="admin-tools-section">
        <h2>Admin Tools</h2>
        <div className="admin-tools-card">
          <div className="tool-item">
            <div className="tool-info">
              <h3>Reset Demo Data</h3>
              <p className="tool-description">
                Clear all messages, bookings, matches, likes, and passes for demo purposes.
                Your profile will be preserved. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={handleResetDemoData}
              disabled={isResetting}
              className="btn-danger"
            >
              {isResetting ? 'Resetting...' : 'Reset Demo Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
