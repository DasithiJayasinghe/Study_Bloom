const express = require("express");
const router = express.Router();
const {
  createFolder,
  getMyFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
} = require("../controllers/folderController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createFolder);
router.get("/my", protect, getMyFolders);
router.get("/:id", protect, getFolderById);
router.put('/:id', protect, updateFolder);
router.delete("/:id", protect, deleteFolder);

module.exports = router;