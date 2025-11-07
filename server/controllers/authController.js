const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

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
      availability
    } = req.body;

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with all profile fields
    const result = await db.query(
      `INSERT INTO users (
        email, password_hash, role, name, profile_photo, bio, location,
        age, skills, hourly_rate, availability
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, email, role, name, profile_photo, bio, location, age,
                 skills, hourly_rate, availability, rating, is_admin, created_at`,
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
        availability || null
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
              skills, hourly_rate, availability, rating, is_admin, created_at
       FROM users WHERE email = $1`,
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
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['brand', 'ambassador']),
  body('name').trim().notEmpty(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

module.exports = {
  register,
  login,
  registerValidation,
  loginValidation,
};
