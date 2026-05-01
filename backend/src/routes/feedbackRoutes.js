const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createFeedback, getResponderFeedback } = require('../controllers/feedbackController');

router.post('/', protect, createFeedback);
router.get('/responder/:userId', protect, getResponderFeedback);

module.exports = router;