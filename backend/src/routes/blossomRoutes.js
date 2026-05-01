const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const blossom = require('../controllers/blossomController');

const router = express.Router();

/** Public ping — confirms `app.use('/api/blossom', …)` is mounted (no JWT). */
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'blossom' });
});

router.use(protect);

router.get('/water', blossom.getWaterDaily);
router.put('/water', blossom.putWaterDaily);

router.get('/mood', blossom.getMoodEntries);
router.post('/mood', blossom.postMoodEntry);

router.get('/tasks', blossom.getTasks);
router.post('/tasks', blossom.postTask);
router.patch('/tasks/:id', blossom.patchTask);
router.delete('/tasks/:id', blossom.deleteTask);

router.get('/habits', blossom.getHabits);
router.post('/habits', blossom.postHabit);
router.patch('/habits/:id', blossom.patchHabit);
router.delete('/habits/:id', blossom.deleteHabit);

router.get('/files', blossom.getFiles);
router.post('/files', blossom.postFile);
router.delete('/files/:id', blossom.deleteFile);

router.get('/expenses', blossom.getExpenses);
router.post('/expenses', blossom.postExpense);
router.delete('/expenses/:id', blossom.deleteExpense);

module.exports = router;
