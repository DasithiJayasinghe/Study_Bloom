const express = require("express");
const router = express.Router();
const {
  createHelpRequest,
  getMyHelpRequests,
  getHelpFeed,
  getHelpRequestById,
  deleteHelpRequest,
  acceptHelpRequest,
  updateHelpRequestStatus,
  removeFolderFromHelpRequest,
} = require("../controllers/helpRequestController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/", protect, upload.array("attachments", 5), createHelpRequest);
router.get("/my", protect, getMyHelpRequests);
router.get("/feed", protect, getHelpFeed);
router.get("/:id", protect, getHelpRequestById);
router.delete("/:id", protect, deleteHelpRequest);

router.patch("/:id/accept", protect, acceptHelpRequest);
router.patch("/:id/status", protect, updateHelpRequestStatus);
router.patch("/:id/remove-folder", protect, removeFolderFromHelpRequest);

module.exports = router;