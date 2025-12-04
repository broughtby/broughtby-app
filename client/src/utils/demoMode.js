/**
 * Demo Mode Helper Utility
 *
 * Determines if a name should be blurred when demo mode is active.
 * Test accounts (is_test = true) are never blurred.
 */

/**
 * Determines if a user's name should be blurred
 *
 * @param {Object} user - User object with is_test field
 * @param {boolean} demoMode - Whether demo mode is currently active
 * @returns {boolean} - Whether the name should be blurred
 */
export const shouldBlurName = (user, demoMode) => {
  // Don't blur if demo mode is off
  if (!demoMode) {
    return false;
  }

  // Don't blur test accounts
  if (user?.is_test === true) {
    return false;
  }

  // Blur all other accounts when demo mode is on
  return true;
};

/**
 * Helper to check if a user is a test account
 *
 * @param {Object} user - User object
 * @returns {boolean} - Whether the user is a test account
 */
export const isTestAccount = (user) => {
  return user?.is_test === true;
};
