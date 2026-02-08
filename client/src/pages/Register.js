import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import PasswordInput from '../components/PasswordInput';
import { getPhotoUrl } from '../services/upload';
import { US_STATES, MAJOR_CITIES, formatLocation } from '../data/locations';
import './Auth.css';
import './Register.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    email: '',
    password: '',
    name: '',
    role: 'brand',
    // Step 2: Profile Info
    profile_photo: '',
    bio: '',
    city: '',
    state: '',
    age: '',
    skills: [],
    // Ambassador-specific
    hourly_rate: '',
    availability: '',
    // Brand-specific
    company_name: '',
    company_logo: '',
    company_website: '',
    contact_title: '',
  });
  const [newSkill, setNewSkill] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

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

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    setStep(2);
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Prepare data - remove ambassador fields if registering as brand
    const registrationData = { ...formData };

    // Combine city and state into location field
    if (formData.city && formData.state) {
      registrationData.location = formatLocation(formData.city, formData.state);
    } else if (formData.city) {
      registrationData.location = formData.city;
    }

    // Remove city and state fields
    delete registrationData.city;
    delete registrationData.state;

    if (formData.role === 'brand') {
      delete registrationData.age;
      delete registrationData.hourly_rate;
      delete registrationData.availability;
    } else {
      // Remove brand-specific fields if registering as ambassador
      delete registrationData.company_name;
      delete registrationData.company_logo;
      delete registrationData.company_website;
      delete registrationData.contact_title;
    }

    const result = await register(registrationData);

    if (result.success) {
      navigate('/discover');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="register-header">
          <h1 className="auth-title">Join BroughtBy</h1>
          <p className="auth-subtitle">Create your {formData.role === 'brand' ? 'brand' : 'ambassador'} account</p>

          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <span>Account</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <span>Profile</span>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Step 1: Basic Account Info */}
        {step === 1 && (
          <form onSubmit={handleNext} className="auth-form">
            <div className="form-group">
              <label htmlFor="role">I am a</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="brand">Brand</option>
                <option value="ambassador">Brand Ambassador</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="name">{formData.role === 'brand' ? 'Your Full Name' : 'Full Name'}</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>

            {formData.role === 'brand' && (
              <>
                <div className="form-group">
                  <label htmlFor="contact_title">Your Job Title</label>
                  <input
                    type="text"
                    id="contact_title"
                    name="contact_title"
                    value={formData.contact_title}
                    onChange={handleChange}
                    placeholder="e.g. Marketing Manager"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="company_name">Company Name</label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                    placeholder="Your Company Name"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <small>Minimum 6 characters</small>
            </div>

            <button type="submit" className="auth-button">
              Continue to Profile
            </button>
          </form>
        )}

        {/* Step 2: Profile Information */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="auth-form profile-form">
            <ImageUpload
              currentImage={formData.profile_photo ? getPhotoUrl(formData.profile_photo) : ''}
              onImageChange={(filePath) => setFormData({ ...formData, profile_photo: filePath })}
              label={formData.role === 'brand' ? 'Company Logo' : 'Profile Photo'}
            />

            <div className="form-group">
              <label htmlFor="bio">{formData.role === 'brand' ? 'About Your Brand' : 'Bio'}</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder={
                  formData.role === 'brand'
                    ? 'Tell ambassadors about your brand...'
                    : 'Tell brands about yourself and your experience...'
                }
              />
            </div>

            {formData.role === 'brand' && (
              <div className="form-group">
                <label htmlFor="company_website">Company Website (Optional)</label>
                <input
                  type="url"
                  id="company_website"
                  name="company_website"
                  value={formData.company_website}
                  onChange={handleChange}
                  placeholder="https://yourcompany.com"
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <select
                  id="city"
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
                <label htmlFor="state">State</label>
                <select
                  id="state"
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

            {formData.role === 'ambassador' && (
              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="18"
                  placeholder="25"
                />
              </div>
            )}

            <div className="form-group">
              <label>Skills & Expertise</label>
              <div className="skills-input">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="Add a skill (e.g., Social Media Marketing)"
                />
                <button type="button" onClick={handleAddSkill} className="add-skill-btn">
                  Add
                </button>
              </div>
              {formData.skills.length > 0 && (
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
              )}
            </div>

            {formData.role === 'ambassador' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="hourly_rate">Hourly Rate ($)</label>
                    <input
                      type="number"
                      id="hourly_rate"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleChange}
                      min="0"
                      placeholder="20"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="availability">Availability</label>
                    <select
                      id="availability"
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
              <button type="button" onClick={handleBack} className="back-button">
                Back
              </button>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
