import React from 'react';
import { useAuth } from '../context/AuthContext';
import './ImpersonationBanner.css';

const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useAuth();

  const handleStopImpersonation = async () => {
    const result = await stopImpersonation();
    if (result.success) {
      // Successfully returned to admin view
      window.location.href = '/'; // Refresh to ensure clean state
    } else {
      alert(result.error || 'Failed to stop impersonation');
    }
  };

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="impersonation-banner">
      <div className="impersonation-content">
        <div className="impersonation-info">
          <svg
            className="impersonation-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 9C11.6569 9 13 7.65685 13 6C13 4.34315 11.6569 3 10 3C8.34315 3 7 4.34315 7 6C7 7.65685 8.34315 9 10 9Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 17C3 14.2386 5.23858 12 8 12H12C14.7614 12 17 14.2386 17 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="impersonation-text">
            Viewing as <strong>{impersonatedUser.name}</strong> ({impersonatedUser.email})
          </span>
        </div>
        <button
          onClick={handleStopImpersonation}
          className="stop-impersonation-btn"
        >
          Return to My Account
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
