const express = require('express');
const router = express.Router();
const { getFolders, getFolder, createFolder, deleteFolder, updateFolder } = require('../controllers/personalFolderController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getFolders)
    .post(protect, createFolder);

router.route('/:id')
    .get(protect, getFolder)
    .put(protect, updateFolder)
    .delete(protect, deleteFolder);

module.exports = router;
