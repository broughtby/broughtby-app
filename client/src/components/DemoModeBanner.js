import React from 'react';
import { useAuth } from '../context/AuthContext';
import './DemoModeBanner.css';

const DemoModeBanner = () => {
  const { demoMode, toggleDemoMode } = useAuth();

  if (!demoMode) {
    return null;
  }

  return (
    <div className="demo-mode-banner">
      <div className="demo-mode-content">
        <div className="demo-mode-info">
          <span className="demo-mode-icon" role="img" aria-label="Camera">
            🎬
          </span>
          <span className="demo-mode-text">
            <strong>Demo Mode Active</strong> - Real names hidden
          </span>
        </div>
        <button
          onClick={toggleDemoMode}
          className="stop-demo-mode-btn"
          aria-label="Turn off demo mode"
        >
          Turn Off Demo Mode
        </button>
      </div>
    </div>
  );
};

export default DemoModeBanner;
