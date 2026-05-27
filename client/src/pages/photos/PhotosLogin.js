import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './photos.css';

const PhotosLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('/photos/campaigns');
      } else {
        setError(result.error || 'Invalid email or password.');
      }
    } catch (err) {
      console.error(err);
      setError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="photos-auth-container">
      <div className="photos-auth-card">
        <h1>Welcome back</h1>
        <p className="photos-auth-sub">Log in to BroughtBy Photos.</p>

        <form onSubmit={onSubmit}>
          <div className="photos-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>
          <div className="photos-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="photos-error">{error}</div>}

          <button
            type="submit"
            className="photos-btn photos-btn-primary photos-btn-large"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="photos-auth-switch">
          New here? <Link to="/photos/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default PhotosLogin;
