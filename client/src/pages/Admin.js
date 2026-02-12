import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import './Admin.css';

const Admin = () => {
  const { isAdmin } = useAuth();
  const [engagements, setEngagements] = useState([]);
  const [brands, setBrands] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({
    brandId: '',
    accountManagerId: '',
    monthlyRate: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch engagements
      const engagementsResponse = await adminAPI.getAllEngagements();
      setEngagements(engagementsResponse.data.engagements);

      // Fetch brands and account managers using admin search
      const brandSearchResponse = await adminAPI.searchUsers('');
      const brandUsers = brandSearchResponse.data.users.filter(u => u.role === 'brand');
      const amUsers = brandSearchResponse.data.users.filter(u => u.role === 'account_manager');

      setBrands(brandUsers);
      setAccountManagers(amUsers);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await adminAPI.createEngagement({
        brandId: parseInt(formData.brandId),
        accountManagerId: parseInt(formData.accountManagerId),
        monthlyRate: parseFloat(formData.monthlyRate),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        notes: formData.notes
      });

      setSuccess('Engagement created successfully!');
      setShowCreateForm(false);
      setFormData({
        brandId: '',
        accountManagerId: '',
        monthlyRate: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: ''
      });

      // Refresh engagements list
      await fetchData();
    } catch (error) {
      console.error('Failed to create engagement:', error);
      setError(error.response?.data?.error || 'Failed to create engagement');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await adminAPI.updateEngagement(id, { status });
      setSuccess(`Engagement ${status} successfully!`);
      await fetchData();
    } catch (error) {
      console.error('Failed to update engagement:', error);
      setError(error.response?.data?.error || 'Failed to update engagement');
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

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="error-message">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin - Engagement Management</h1>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create New Engagement'}
        </button>
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

      {showCreateForm && (
        <div className="create-form-card">
          <h2>Create New Engagement</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="brandId">Brand *</label>
              <select
                id="brandId"
                name="brandId"
                value={formData.brandId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a brand...</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.company_name || brand.name} ({brand.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="accountManagerId">Account Manager *</label>
              <select
                id="accountManagerId"
                name="accountManagerId"
                value={formData.accountManagerId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select an account manager...</option>
                {accountManagers.map(am => (
                  <option key={am.id} value={am.id}>
                    {am.name} ({am.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="monthlyRate">Monthly Rate ($) *</label>
              <input
                type="number"
                id="monthlyRate"
                name="monthlyRate"
                value={formData.monthlyRate}
                onChange={handleInputChange}
                placeholder="1200"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date (Optional)</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate}
              />
              <small className="helper-text">Leave blank for ongoing engagement</small>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Scope of work, special instructions, etc."
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Engagement
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="engagements-list">
        <h2>All Engagements ({engagements.length})</h2>

        {engagements.length === 0 ? (
          <div className="empty-state">
            <p>No engagements yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="engagements-table">
            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Account Manager</th>
                  <th>Monthly Rate</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {engagements.map(engagement => (
                  <tr key={engagement.id}>
                    <td>
                      <div className="user-info">
                        <strong>{engagement.brand_company_name || engagement.brand_name}</strong>
                        <span className="email">{engagement.brand_email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-info">
                        <strong>{engagement.account_manager_name}</strong>
                        <span className="email">{engagement.account_manager_email}</span>
                      </div>
                    </td>
                    <td>${engagement.monthly_rate.toLocaleString()}/mo</td>
                    <td>{new Date(engagement.start_date).toLocaleDateString()}</td>
                    <td>
                      {engagement.end_date
                        ? new Date(engagement.end_date).toLocaleDateString()
                        : <span className="text-muted">Ongoing</span>
                      }
                    </td>
                    <td>
                      <span className={`status-badge status-${engagement.status}`}>
                        {engagement.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {engagement.status === 'active' && (
                          <>
                            <button
                              className="btn-small btn-warning"
                              onClick={() => handleUpdateStatus(engagement.id, 'paused')}
                            >
                              Pause
                            </button>
                            <button
                              className="btn-small btn-danger"
                              onClick={() => handleUpdateStatus(engagement.id, 'ended')}
                            >
                              End
                            </button>
                          </>
                        )}
                        {engagement.status === 'paused' && (
                          <>
                            <button
                              className="btn-small btn-success"
                              onClick={() => handleUpdateStatus(engagement.id, 'active')}
                            >
                              Resume
                            </button>
                            <button
                              className="btn-small btn-danger"
                              onClick={() => handleUpdateStatus(engagement.id, 'ended')}
                            >
                              End
                            </button>
                          </>
                        )}
                        {engagement.status === 'ended' && (
                          <span className="text-muted">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
