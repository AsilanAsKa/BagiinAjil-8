const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const {
  login,
  logout,
  refresh,
  register,
  verifyOtp
} = require('../controllers/authController');
const validateRequest = require('../middleware/validate');
const { ROLES } = require('../models/User');
const { isValidPhone } = require('../utils/validation');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false
});

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('phone').custom((value) => isValidPhone(value)).withMessage('Invalid phone number'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(ROLES).withMessage('Invalid role')
  ],
  validateRequest,
  register
);

router.post(
  '/verify-otp',
  otpLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits')
  ],
  validateRequest,
  verifyOtp
);

router.post(
  '/login',
  authLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  login
);

router.post(
  '/refresh',
  authLimiter,
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validateRequest,
  refresh
);

router.post('/logout', logout);

module.exports = router;
