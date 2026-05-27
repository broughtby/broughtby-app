import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './photos.css';

const PhotosSignup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    company_name: '',
    name: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const change = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.company_name.trim()) return setError('Company name is required.');
    if (!form.name.trim()) return setError('Your name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');

    setSubmitting(true);
    try {
      const result = await register({
        email: form.email.trim(),
        password: form.password,
        role: 'brand',
        name: form.name.trim(),
        company_name: form.company_name.trim(),
        signup_source: 'photos',
      });
      if (result.success) {
        navigate('/photos/campaigns');
      } else {
        setError(result.error || 'Could not create account.');
      }
    } catch (err) {
      console.error(err);
      setError('Sign-up failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="photos-auth-container">
      <div className="photos-auth-card">
        <h1>Create your account</h1>
        <p className="photos-auth-sub">
          Free pilot — set up your first campaign in minutes.
        </p>

        <form onSubmit={onSubmit}>
          <div className="photos-field">
            <label>Company name</label>
            <input
              type="text"
              value={form.company_name}
              onChange={change('company_name')}
              placeholder="e.g. Medly Wine"
              autoComplete="organization"
            />
          </div>
          <div className="photos-field">
            <label>Your name</label>
            <input
              type="text"
              value={form.name}
              onChange={change('name')}
              placeholder="First and last"
              autoComplete="name"
            />
          </div>
          <div className="photos-field">
            <label>Work email</label>
            <input
              type="email"
              value={form.email}
              onChange={change('email')}
              placeholder="you@company.com"
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>
          <div className="photos-field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={change('password')}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>

          {error && <div className="photos-error">{error}</div>}

          <button
            type="submit"
            className="photos-btn photos-btn-primary photos-btn-large"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="photos-auth-switch">
          Already have an account? <Link to="/photos/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default PhotosSignup;
