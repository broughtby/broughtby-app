const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { sendPasswordResetEmail } = require('../services/emailService');

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      role,
      name,
      profile_photo,
      bio,
      location,
      age,
      skills,
      hourly_rate,
      availability,
      company_name,
      company_logo,
      company_website,
      contact_title
    } = req.body;

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with all profile fields
    const result = await db.query(
      `INSERT INTO users (
        email, password_hash, role, name, profile_photo, bio, location,
        age, skills, hourly_rate, availability,
        company_name, company_logo, company_website, contact_title
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, email, role, name, profile_photo, bio, location, age,
                 skills, hourly_rate, availability, rating, is_admin, is_preview, created_at,
                 company_name, company_logo, company_website, contact_title`,
      [
        email,
        passwordHash,
        role,
        name,
        profile_photo || null,
        bio || null,
        location || null,
        age || null,
        skills || [],
        hourly_rate || null,
        availability || null,
        company_name || null,
        company_logo || null,
        company_website || null,
        contact_title || null
      ]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, isAdmin: user.is_admin || false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        profile_photo: user.profile_photo,
        bio: user.bio,
        location: user.location,
        age: user.age,
        skills: user.skills,
        hourly_rate: user.hourly_rate,
        availability: user.availability,
        rating: user.rating,
        isAdmin: user.is_admin || false,
        isPreview: user.is_preview || false,
        company_name: user.company_name,
        company_logo: user.company_logo,
        company_website: user.company_website,
        contact_title: user.contact_title,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await db.query(
      `SELECT id, email, password_hash, role, name, profile_photo, bio, location, age,
              skills, hourly_rate, availability, rating, is_admin, is_preview, created_at,
              company_name, company_logo, company_website, contact_title
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    console.log('🔍 Backend Login Debug:', {
      email: user.email,
      is_admin_from_db: user.is_admin,
      role: user.role
    });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isAdminValue = user.is_admin || false;
    console.log('📤 Sending isAdmin value:', isAdminValue);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, isAdmin: isAdminValue },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const responseUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      profile_photo: user.profile_photo,
      bio: user.bio,
      location: user.location,
      age: user.age,
      skills: user.skills,
      hourly_rate: user.hourly_rate,
      availability: user.availability,
      rating: user.rating,
      isAdmin: isAdminValue,
      isPreview: user.is_preview || false,
      company_name: user.company_name,
      company_logo: user.company_logo,
      company_website: user.company_website,
      contact_title: user.contact_title,
    };

    console.log('📤 Full response user object:', responseUser);

    res.json({
      message: 'Login successful',
      token,
      user: responseUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const registerValidation = [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['brand', 'ambassador']),
  body('name').trim().notEmpty(),
];

const loginValidation = [
  body('email').isEmail(),
  body('password').notEmpty(),
];

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user by email
    const result = await db.query(
      'SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    // Always return success message for security (don't reveal if email exists)
    if (result.rows.length === 0) {
      return res.json({
        message: 'If that email exists in our system, we sent a password reset link.'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to database
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    // Send reset email
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail({
      userEmail: user.email,
      userName: user.name,
      resetLink,
    });

    res.json({
      message: 'If that email exists in our system, we sent a password reset link.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    // Find user with valid token
    const result = await db.query(
      `SELECT id, email, reset_token_expires
       FROM users
       WHERE reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db.query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

const forgotPasswordValidation = [
  body('email').isEmail(),
];

const resetPasswordValidation = [
  body('token').notEmpty().trim(),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

module.exports = {
  register,
  login,
  registerValidation,
  loginValidation,
  forgotPassword,
  resetPassword,
  forgotPasswordValidation,
  resetPasswordValidation,
};
