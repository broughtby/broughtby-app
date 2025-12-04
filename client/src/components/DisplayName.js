import React from 'react';
import { shouldBlurName } from '../utils/demoMode';
import './DisplayName.css';

/**
 * DisplayName Component
 *
 * Displays a user's name with optional blur effect when demo mode is active.
 * Test accounts (is_test = true) are never blurred.
 *
 * @param {Object} user - User object with name and is_test fields
 * @param {boolean} demoMode - Whether demo mode is currently active
 * @param {string} className - Optional additional CSS class
 */
const DisplayName = ({ user, demoMode, className = '' }) => {
  const shouldBlur = shouldBlurName(user, demoMode);

  return (
    <span className={`${shouldBlur ? 'blurred-name' : ''} ${className}`.trim()}>
      {user.name}
    </span>
  );
};

export default DisplayName;
