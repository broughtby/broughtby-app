const express = require('express');
const router = express.Router();
const {
  register,
  login,
  registerValidation,
  loginValidation,
  forgotPassword,
  resetPassword,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../controllers/authController');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

module.exports = router;
