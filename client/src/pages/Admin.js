import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import './Admin.css';

const Admin = () => {
  const { isAdmin } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
