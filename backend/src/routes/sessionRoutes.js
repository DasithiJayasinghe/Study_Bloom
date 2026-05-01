const express = require('express');
const router = express.Router();
const { createSession, getStats, getDailyStatsForMonth, getWeeklyStats, getMonthlyStats } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createSession);
router.get('/stats', getStats);
router.get('/stats/daily', getDailyStatsForMonth);
router.get('/stats/weekly', getWeeklyStats);
router.get('/stats/monthly', getMonthlyStats);

module.exports = router;
