const express = require("express");
const router = express.Router();
const {
    getMyContacts,
    getChatMessages,
    sendMessage,
    updateChatStatus
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");
const uploadChatData = require("../config/multer");

router.get("/contacts", protect, getMyContacts);
router.get("/:roomId/messages", protect, getChatMessages);
router.post("/:roomId/messages", protect, uploadChatData.array('files', 10), sendMessage);
router.put("/:roomId/status", protect, updateChatStatus);

module.exports = router;