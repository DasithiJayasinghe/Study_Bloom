const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", notificationController.getNotifications);
router.put("/:id/read", notificationController.markAsRead);
router.put("/mark-all-read", notificationController.markAllRead);
router.delete("/:id", notificationController.deleteNotification);
router.delete("/clear-all", notificationController.clearNotifications);

module.exports = router;
