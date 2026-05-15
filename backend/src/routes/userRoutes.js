const express = require('express');
const { getProfile } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, getProfile);

module.exports = router;
