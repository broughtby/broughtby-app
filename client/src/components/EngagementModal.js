import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPhotoUrl } from '../services/upload';
import DisplayName from './DisplayName';
import DisplayRate from './DisplayRate';
import './EngagementModal.css';

const EngagementModal = ({ accountManager, onClose, onSubmit }) => {
  const { demoMode, user } = useAuth();

  // Pre-populate with defaults for preview users
  const getDefaultStartDate = () => {
    const oneWeekOut = new Date();
    oneWeekOut.setDate(oneWeekOut.getDate() + 7);
    return oneWeekOut.toISOString().split('T')[0];
  };

  const isPreview = user?.isPreview;

  const [formData, setFormData] = useState({
    startDate: isPreview ? getDefaultStartDate() : '',
    endDate: '',
    notes: isPreview ? 'Looking for ongoing support with event activations and ambassador coordination for our brand. We typically run 2-3 events per month in the Chicago area.' : '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Start Date validation
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      const selectedDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }

    // End Date validation (optional, but must be after start date if provided)
    if (formData.endDate) {
      if (!formData.startDate) {
        newErrors.endDate = 'Please select a start date first';
      } else {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        if (endDate <= startDate) {
          newErrors.endDate = 'End date must be after start date';
        }
      }
    }

    // Notes validation (optional but helpful)
    if (!formData.notes.trim()) {
      newErrors.notes = 'Please provide some details about the scope of work';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        accountManagerId: accountManager.id,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        monthlyRate: parseFloat(accountManager.monthly_rate),
        notes: formData.notes,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content engagement-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2>Hire Account Manager</h2>

        {/* Account Manager Info */}
        <div className="engagement-am-info">
          <img
            src={accountManager.profile_photo ? getPhotoUrl(accountManager.profile_photo) : 'https://via.placeholder.com/80'}
            alt={accountManager.name}
            className="am-photo"
          />
          <div className="am-details">
            <h3>
              <DisplayName
                user={accountManager}
                name={accountManager.name}
                demoMode={demoMode}
              />
            </h3>
            <p className="am-rate">
              <DisplayRate
                user={accountManager}
                rate={accountManager.monthly_rate}
                demoMode={demoMode}
                suffix="/month"
              />
            </p>
            {accountManager.location && (
              <p className="am-location">{accountManager.location}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="engagement-form">
          {/* Start Date */}
          <div className="form-group">
            <label htmlFor="startDate">
              Start Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={errors.startDate ? 'error' : ''}
            />
            {errors.startDate && <span className="error-message">{errors.startDate}</span>}
          </div>

          {/* End Date */}
          <div className="form-group">
            <label htmlFor="endDate">
              End Date <span className="helper-text">(Optional)</span>
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={errors.endDate ? 'error' : ''}
            />
            {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            {!errors.endDate && <span className="helper-text">Leave blank for ongoing engagement</span>}
          </div>

          {/* Scope of Work / Notes */}
          <div className="form-group">
            <label htmlFor="notes">
              Scope of Work <span className="required">*</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Describe what you need help with (event coordination, ambassador management, etc.)"
              className={errors.notes ? 'error' : ''}
            />
            {errors.notes && <span className="error-message">{errors.notes}</span>}
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Send Engagement Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EngagementModal;
