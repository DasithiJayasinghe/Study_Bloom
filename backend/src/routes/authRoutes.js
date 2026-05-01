const express = require('express');
const { register, login, updateProfile, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/update-profile', protect, updateProfile);
router.put('/update-password', protect, updatePassword);

module.exports = router;
