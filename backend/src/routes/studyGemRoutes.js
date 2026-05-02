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
const upload = require('../middleware/uploadMiddleware');

router.route('/')
    .get(protect, getStudyGems)
    .post(protect, upload.array('attachments', 5), createStudyGem);

router.route('/:id')
    .get(protect, getStudyGem)
    .put(protect, upload.array('attachments', 5), updateStudyGem)
    .delete(protect, deleteStudyGem);

module.exports = router;
