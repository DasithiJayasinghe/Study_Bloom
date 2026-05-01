const express = require('express');
const router = express.Router();
const {
    getStudyGems,
    getStudyGem,
    createStudyGem,
    updateStudyGem,
    deleteStudyGem
} = require('../controllers/studyGemController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getStudyGems)
    .post(protect, createStudyGem);

router.route('/:id')
    .get(protect, getStudyGem)
    .put(protect, updateStudyGem)
    .delete(protect, deleteStudyGem);

module.exports = router;
