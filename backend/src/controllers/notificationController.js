const Notification = require("../models/Notification");

// Get all notifications for the current user
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("sender", "fullName profilePicture")
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark all as read
exports.markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user._id }, { read: true });
        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, message: "Notification deleted" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Clear all notifications
exports.clearNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id });
        res.status(200).json({ success: true, message: "All notifications cleared" });
    } catch (error) {
        console.error("Error clearing notifications:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
