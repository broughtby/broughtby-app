import React, { useState } from 'react';
import { getPhotoUrl } from '../services/upload';
import './BookingModal.css';

const BookingModal = ({ ambassador, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    eventLocation: '',
    notes: '',
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

    // Event Name validation
    if (!formData.eventName.trim()) {
      newErrors.eventName = 'Event name is required';
    }

    // Event Date validation
    if (!formData.eventDate) {
      newErrors.eventDate = 'Event date is required';
    } else {
      const selectedDate = new Date(formData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.eventDate = 'Event date cannot be in the past';
      }
    }

    // Start Time validation
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    // End Time validation
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    } else if (formData.startTime && formData.endTime <= formData.startTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    // Event Location validation
    if (!formData.eventLocation.trim()) {
      newErrors.eventLocation = 'Event location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        ...formData,
        ambassadorId: ambassador.id,
        ambassadorName: ambassador.name,
        hourlyRate: ambassador.hourly_rate,
        duration: duration,
        estimatedCost: estimatedCost,
      });
    }
  };

  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      const diffMs = end - start;
      const hours = diffMs / (1000 * 60 * 60);
      return hours > 0 ? hours : 0;
    }
    return 0;
  };

  const duration = calculateDuration();
  const estimatedCost = duration > 0 ? duration * ambassador.hourly_rate : 0;

  return (
    <div className="booking-modal" onClick={onClose}>
      <div className="booking-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal-header">
          <h1 className="booking-modal-title">Book Ambassador</h1>
          <button className="booking-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Ambassador Info */}
        <div className="booking-ambassador-info">
          {ambassador.profile_photo && (
            <img
              src={getPhotoUrl(ambassador.profile_photo)}
              alt={ambassador.name}
              className="booking-ambassador-photo"
            />
          )}
          <div className="booking-ambassador-details">
            <h2>{ambassador.name}</h2>
            <p className="booking-rate">
              <span className="rate-icon">$</span> ${ambassador.hourly_rate}/hour
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="booking-form">
          {/* Event Name */}
          <div className="form-group">
            <label htmlFor="eventName">Event Name *</label>
            <input
              type="text"
              id="eventName"
              name="eventName"
              value={formData.eventName}
              onChange={handleChange}
              placeholder="e.g., Summer Product Launch"
              className={errors.eventName ? 'error' : ''}
            />
            {errors.eventName && <span className="error-message">{errors.eventName}</span>}
          </div>

          {/* Event Date */}
          <div className="form-group">
            <label htmlFor="eventDate">Event Date *</label>
            <input
              type="date"
              id="eventDate"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              className={errors.eventDate ? 'error' : ''}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.eventDate && <span className="error-message">{errors.eventDate}</span>}
          </div>

          {/* Time Fields */}
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

          {/* Event Location */}
          <div className="form-group">
            <label htmlFor="eventLocation">Event Location *</label>
            <input
              type="text"
              id="eventLocation"
              name="eventLocation"
              value={formData.eventLocation}
              onChange={handleChange}
              placeholder="Address or venue name"
              className={errors.eventLocation ? 'error' : ''}
            />
            {errors.eventLocation && <span className="error-message">{errors.eventLocation}</span>}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Share special instructions on what to do when you get there, what to wear, etc."
              rows="4"
              className={errors.notes ? 'error' : ''}
            />
            {errors.notes && <span className="error-message">{errors.notes}</span>}
          </div>

          {/* Submit Button */}
          <button type="submit" className="booking-submit-button">
            Continue to Review
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
