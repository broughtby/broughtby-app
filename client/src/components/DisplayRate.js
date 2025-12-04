import React from 'react';
import { shouldBlurName } from '../utils/demoMode';
import './DisplayName.css'; // Reuse the same blur styles

/**
 * DisplayRate Component
 *
 * Displays an hourly rate with optional blur effect on the amount when demo mode is active.
 * Test accounts (is_test = true) are never blurred.
 * Format: $[amount]/hr or $[amount]/hour where only [amount] is blurred when needed.
 *
 * @param {Object} user - User object with is_test field
 * @param {number} rate - The hourly rate amount
 * @param {boolean} demoMode - Whether demo mode is currently active
 * @param {string} suffix - Optional suffix (default: '/hr', can be '/hour')
 * @param {string} className - Optional additional CSS class
 */
const DisplayRate = ({ user, rate, demoMode, suffix = '/hr', className = '' }) => {
  const shouldBlur = shouldBlurName(user, demoMode);

  if (!rate) {
    return <span className={className}>N/A</span>;
  }

  return (
    <span className={className}>
      $<span className={shouldBlur ? 'blurred-name' : ''}>{rate}</span>{suffix}
    </span>
  );
};

export default DisplayRate;
