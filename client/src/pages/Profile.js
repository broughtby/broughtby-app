import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import { getPhotoUrl } from '../services/upload';
import { US_STATES, MAJOR_CITIES, parseLocation, formatLocation } from '../data/locations';
import { adminAPI } from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    profile_photo: '',
    bio: '',
    city: '',
    state: '',
    age: '',
    skills: [],
    hourly_rate: '',
    availability: '',
  });
  const [newSkill, setNewSkill] = useState('');
  const [message, setMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (user) {
      // Parse existing location into city and state
      const { city, state } = parseLocation(user.location);

      setFormData({
        email: user.email || '',
        name: user.name || '',
        profile_photo: user.profile_photo || '',
        bio: user.bio || '',
        city: city || '',
        state: state || '',
        age: user.age || '',
        skills: user.skills || [],
        hourly_rate: user.hourly_rate || '',
        availability: user.availability || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((skill) => skill !== skillToRemove),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Prepare data with combined location
    const updateData = { ...formData };

    // Combine city and state into location field
    if (formData.city && formData.state) {
      updateData.location = formatLocation(formData.city, formData.state);
    } else if (formData.city) {
      updateData.location = formData.city;
    }

    // Remove city and state fields
    delete updateData.city;
    delete updateData.state;

    const result = await updateUser(updateData);

    if (result.success) {
      setMessage('Profile updated successfully!');
      setEditing(false);
    } else {
      setMessage(result.error || 'Failed to update profile');
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
    setMessage('');

    try {
      const response = await adminAPI.resetDemoData(user.id);

      if (response.data.success) {
        const { deleted } = response.data;
        setMessage(
          `Demo data reset successfully! Deleted: ${deleted.messages} messages, ` +
          `${deleted.bookings} bookings, ${deleted.matches} matches, ` +
          `${deleted.likes} likes, ${deleted.passes} passes.`
        );
      }
    } catch (error) {
      console.error('Reset demo data error:', error);
      setMessage(
        error.response?.data?.error ||
        'Failed to reset demo data. Please try again or contact support.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="profile-container container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>My Profile</h1>
          {!editing && (
            <button onClick={() => setEditing(true)} className="edit-button">
              Edit Profile
            </button>
          )}
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <ImageUpload
              currentImage={formData.profile_photo ? getPhotoUrl(formData.profile_photo) : ''}
              onImageChange={(filePath) => setFormData({ ...formData, profile_photo: filePath })}
              label="Profile Photo"
            />

            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                >
                  <option value="">Select City...</option>
                  {MAJOR_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>State</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                >
                  <option value="">Select State...</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {user.role === 'ambassador' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="18"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Skills</label>
              <div className="skills-input">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="Add a skill..."
                />
                <button type="button" onClick={handleAddSkill} className="add-skill-button">
                  Add
                </button>
              </div>
              <div className="skills-list">
                {formData.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="remove-skill"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {user.role === 'ambassador' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Hourly Rate ($)</label>
                    <input
                      type="number"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Availability</label>
                    <select
                      name="availability"
                      value={formData.availability}
                      onChange={handleChange}
                    >
                      <option value="">Select...</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Flexible">Flexible</option>
                      <option value="Limited">Limited</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" className="save-button">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-display">
            <div className="profile-photo-section">
              <img
                src={user.profile_photo ? getPhotoUrl(user.profile_photo) : 'https://via.placeholder.com/200'}
                alt={user.name}
                className="profile-photo"
              />
              <div className="profile-basic">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
                <span className="role-badge">{user.role === 'brand' ? 'Brand' : 'Ambassador'}</span>
              </div>
            </div>

            {user.bio && (
              <div className="profile-section">
                <h3>About</h3>
                <p>{user.bio}</p>
              </div>
            )}

            <div className="profile-section">
              <h3>Details</h3>
              <div className="details-grid">
                {user.location && (
                  <div className="detail">
                    <span className="detail-label">Location</span>
                    <span>{user.location}</span>
                  </div>
                )}
                {user.age && (
                  <div className="detail">
                    <span className="detail-label">Age</span>
                    <span>{user.age}</span>
                  </div>
                )}
                {user.hourly_rate && (
                  <div className="detail">
                    <span className="detail-label">Rate</span>
                    <span>${user.hourly_rate}/hr</span>
                  </div>
                )}
                {user.availability && (
                  <div className="detail">
                    <span className="detail-label">Availability</span>
                    <span>{user.availability}</span>
                  </div>
                )}
              </div>
            </div>

            {user.skills && user.skills.length > 0 && (
              <div className="profile-section">
                <h3>Skills</h3>
                <div className="skills-list">
                  {user.skills.map((skill, index) => (
                    <span key={index} className="skill-tag-display">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {user.isAdmin && (
              <div className="profile-section admin-section">
                <h3>Admin Tools</h3>
                <div className="admin-tools">
                  <p className="admin-warning">
                    Admin-only actions. Use with caution.
                  </p>
                  <button
                    onClick={handleResetDemoData}
                    disabled={isResetting}
                    className="reset-demo-data-button"
                  >
                    {isResetting ? 'Resetting...' : 'Reset Demo Data'}
                  </button>
                  <p className="reset-description">
                    Clear all messages, bookings, matches, likes, and passes for demo purposes.
                    Your profile will be preserved.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
