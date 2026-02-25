import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './CreateInquiryModal.css';

const CreateInquiryModal = ({ onClose, onSubmit, matchCount }) => {
  const { user } = useAuth();

  const getDefaultEventDate = () => {
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
    return twoWeeksOut.toISOString().split('T')[0];
  };

  const isPreview = user?.isPreview;

  const [formData, setFormData] = useState({
    eventName: isPreview ? (user?.preview_event_name || `${user?.company_name || 'Brand'} Event`) : '',
    eventDate: isPreview ? getDefaultEventDate() : '',
    startTime: isPreview ? '10:00' : '',
    endTime: isPreview ? '12:00' : '',
    eventLocation: isPreview ? (user?.location || '') : '',
    hourlyRate: isPreview ? '50' : '',
    notes: isPreview ? (user?.preview_event_notes || '') : '',
  });

  const [errors, setErrors] = useState({});

  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date();
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return new Date();
    }
    return new Date(year, month - 1, day);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.eventName.trim()) {
      newErrors.eventName = 'Event name is required';
    }

    if (!formData.eventDate) {
      newErrors.eventDate = 'Event date is required';
    } else {
      const selectedDate = parseLocalDate(formData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.eventDate = 'Event date cannot be in the past';
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    } else if (formData.startTime && formData.endTime <= formData.startTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (!formData.eventLocation.trim()) {
      newErrors.eventLocation = 'Event location is required';
    }

    if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) {
      newErrors.hourlyRate = 'Please enter a valid hourly rate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        ...formData,
        duration: duration,
        totalCost: estimatedCost,
      });
    }
  };

  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      const diff = (end - start) / (1000 * 60 * 60);
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const duration = calculateDuration();
  const estimatedCost = duration * (parseFloat(formData.hourlyRate) || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Check Availability</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <p className="inquiry-description">
          Send this event to all {matchCount} of your matched ambassadors to see who's available.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="eventName">Event Name *</label>
            <input
              type="text"
              id="eventName"
              name="eventName"
              value={formData.eventName}
              onChange={handleChange}
              className={errors.eventName ? 'error' : ''}
              placeholder="e.g., Product Launch Event"
            />
            {errors.eventName && <span className="error-message">{errors.eventName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eventDate">Event Date *</label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className={errors.eventDate ? 'error' : ''}
              />
              {errors.eventDate && <span className="error-message">{errors.eventDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="hourlyRate">Hourly Rate *</label>
              <div className="input-with-prefix">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  id="hourlyRate"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  className={errors.hourlyRate ? 'error' : ''}
                  placeholder="50"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.hourlyRate && <span className="error-message">{errors.hourlyRate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className={errors.startTime ? 'error' : ''}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className={errors.endTime ? 'error' : ''}
              />
              {errors.endTime && <span className="error-message">{errors.endTime}</span>}
            </div>
          </div>

          {duration > 0 && (
            <div className="estimated-cost">
              <span>Duration: {duration} hours</span>
              <span>Estimated Cost: ${estimatedCost.toFixed(2)}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="eventLocation">Event Location *</label>
            <input
              type="text"
              id="eventLocation"
              name="eventLocation"
              value={formData.eventLocation}
              onChange={handleChange}
              className={errors.eventLocation ? 'error' : ''}
              placeholder="e.g., 123 Main St, Los Angeles, CA"
            />
            {errors.eventLocation && <span className="error-message">{errors.eventLocation}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="notes">Event Details (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Add any additional details about the event..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Send to {matchCount} Ambassador{matchCount !== 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInquiryModal;
