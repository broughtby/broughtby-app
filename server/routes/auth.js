const express = require('express');
const router = express.Router();
const { register, login, registerValidation, loginValidation } = require('../controllers/authController');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

module.exports = router;
