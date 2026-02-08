import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import ReviewsList from '../components/ReviewsList';
import BrandAvatar from '../components/BrandAvatar';
import { getPhotoUrl } from '../services/upload';
import { US_STATES, MAJOR_CITIES, parseLocation, formatLocation } from '../data/locations';
import { adminAPI, reviewAPI } from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, updateUser, demoMode } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    profile_photo: '',
    bio: '',
    city: '',
    state: '',
    age: '',
    hourly_rate: '',
    availability: '',
    // Brand-specific
    company_name: '',
    company_logo: '',
    company_website: '',
    contact_title: '',
  });
  const [message, setMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(true);

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
        hourly_rate: user.hourly_rate || '',
        availability: user.availability || '',
        company_name: user.company_name || '',
        company_logo: user.company_logo || '',
        company_website: user.company_website || '',
        contact_title: user.contact_title || '',
      });

      // Fetch reviews for the user
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    if (!user) return;

    try {
      const response = await reviewAPI.getUserReviews(user.id);
      setReviews(response.data.reviews);
      setReviewCount(response.data.reviewCount);
      setAverageRating(response.data.averageRating);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
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

            {user.role === 'brand' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    name="contact_title"
                    value={formData.contact_title}
                    onChange={handleChange}
                    placeholder="e.g. Marketing Manager"
                  />
                </div>
              </div>
            )}

            {user.role === 'brand' ? (
              <>
                <ImageUpload
                  currentImage={formData.company_logo ? getPhotoUrl(formData.company_logo) : ''}
                  onImageChange={(filePath) => setFormData({ ...formData, company_logo: filePath })}
                  label="Company Logo"
                />
                <ImageUpload
                  currentImage={formData.profile_photo ? getPhotoUrl(formData.profile_photo) : ''}
                  onImageChange={(filePath) => setFormData({ ...formData, profile_photo: filePath })}
                  label="Your Photo"
                />
              </>
            ) : (
              <ImageUpload
                currentImage={formData.profile_photo ? getPhotoUrl(formData.profile_photo) : ''}
                onImageChange={(filePath) => setFormData({ ...formData, profile_photo: filePath })}
                label="Profile Photo"
              />
            )}

            <div className="form-group">
              <label>{user.role === 'brand' ? 'About Your Brand' : 'Bio'}</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder={user.role === 'brand' ? 'Tell ambassadors about your brand...' : 'Tell us about yourself...'}
              />
            </div>

            {user.role === 'brand' && (
              <div className="form-group">
                <label>Company Website</label>
                <input
                  type="url"
                  name="company_website"
                  value={formData.company_website}
                  onChange={handleChange}
                  placeholder="https://yourcompany.com"
                />
              </div>
            )}

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
              {user.role === 'brand' ? (
                <BrandAvatar
                  companyLogo={user.company_logo}
                  personPhoto={user.profile_photo}
                  companyName={user.company_name}
                  personName={user.name}
                  size="large"
                />
              ) : (
                <img
                  src={user.profile_photo ? getPhotoUrl(user.profile_photo) : 'https://via.placeholder.com/200'}
                  alt={user.name}
                  className="profile-photo"
                />
              )}
              <div className="profile-basic">
                <h2>{user.role === 'brand' ? (user.company_name || user.name) : user.name}</h2>
                {user.role === 'brand' && user.company_name && (
                  <p className="profile-contact">
                    Contact: {user.name}{user.contact_title && `, ${user.contact_title}`}
                  </p>
                )}
                {user.role === 'brand' && user.company_website && (
                  <p className="profile-website">
                    <a href={user.company_website} target="_blank" rel="noopener noreferrer">
                      {user.company_website}
                    </a>
                  </p>
                )}
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

            {/* Reviews Section */}
            <div className="profile-section">
              <h3>Reviews</h3>
              {loadingReviews ? (
                <p className="loading-reviews">Loading reviews...</p>
              ) : (
                <ReviewsList
                  reviews={reviews}
                  reviewCount={reviewCount}
                  averageRating={averageRating}
                  demoMode={demoMode}
                />
              )}
            </div>

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
