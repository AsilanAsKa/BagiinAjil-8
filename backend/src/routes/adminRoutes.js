const express = require('express');
const { listUsers } = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticate, authorizeRoles('admin'), listUsers);

module.exports = router;
