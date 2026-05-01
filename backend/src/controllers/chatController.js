const ChatRoom = require("../models/ChatRoom");
const Concern = require("../models/Concern");
const Message = require("../models/Message");
const { getIO } = require("../config/socket");

const mapFileType = (mimeType = "") => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "text/csv") return "csv";
    return "other";
};

const getEntityId = (entity) => {
    if (!entity) return "";
    if (typeof entity === "object" && entity._id) {
        return entity._id.toString();
    }
    return entity.toString();
};

const userHasAccess = (room, userId) => {
    const normalizedUserId = getEntityId(userId);
    return (
        getEntityId(room.requester) === normalizedUserId ||
        getEntityId(room.responder) === normalizedUserId
    );
};

const getMyContacts = async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};
        
        if (role === 'requester') {
            query = { requester: req.user._id };
        } else if (role === 'responder') {
            query = { responder: req.user._id };
        } else {
            query = { $or: [{ requester: req.user._id }, { responder: req.user._id }] };
        }

        const rooms = await ChatRoom.find(query)
            .populate("requester", "fullName email profilePicture")
            .populate("responder", "fullName email profilePicture")
            .populate("concern", "title description status")
            .sort({ updatedAt: -1 });

        return res.json(rooms);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getChatMessages = async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.roomId)
            .populate("requester", "fullName email profilePicture")
            .populate("responder", "fullName email profilePicture")
            .populate("concern", "title description status");

        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        if (!userHasAccess(room, req.user._id)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const messages = await Message.find({ room: room._id })
            .populate("sender", "fullName email profilePicture")
            .sort({ createdAt: 1 });

        // Check if feedback already exists for this room by the requester
        const feedback = await require('../models/Feedback').findOne({
            chatRoom: room._id,
            requester: room.requester._id
        });

        return res.json({
            room,
            messages,
            readOnly: room.status === "complete",
            feedbackSubmitted: !!feedback
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        if (!userHasAccess(room, req.user._id)) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (room.status === "complete") {
            return res.status(400).json({ message: "Chat is closed. Read-only mode." });
        }

        const attachments =
            req.files?.map((file) => ({
                fileName: file.originalname,
                fileUrl: `/uploads/${file.filename}`,
                fileType: mapFileType(file.mimetype),
                mimeType: file.mimetype,
                size: file.size
            })) || [];

        if ((!text || !text.trim()) && attachments.length === 0) {
            return res.status(400).json({ message: "Message text or file is required" });
        }

        const message = await Message.create({
            room: room._id,
            sender: req.user._id,
            text: text || "",
            attachments,
            readBy: [req.user._id]
        });

        const populatedMessage = await Message.findById(message._id).populate(
            "sender",
            "fullName email profilePicture"
        );

        room.updatedAt = new Date();
        await room.save();

        const io = getIO();
        console.log(`Emitting newMessage to room: ${room._id.toString()}`);
        io.to(room._id.toString()).emit("newMessage", populatedMessage);

        return res.status(201).json(populatedMessage);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateChatStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        if (room.responder.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only responder can change status" });
        }

        if (!["pending", "complete"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        room.status = status;
        if (status === "complete") {
            room.closedBy = req.user._id;
        } else {
            room.closedBy = null;
        }

        await room.save();

        const updatedConcern = await Concern.findByIdAndUpdate(room.concern, {
            status: status === "complete" ? "complete" : "accepted",
            completedAt: status === "complete" ? new Date() : null
        }, { new: true });

        if (!updatedConcern) {
            return res.status(404).json({ message: "Associated Concern not found" });
        }

        // Also update associated HelpRequest if it exists
        const HelpRequest = require('../models/HelpRequest');
        await HelpRequest.findOneAndUpdate(
            { concernRef: room.concern },
            { status: status === "complete" ? "resolved" : "accepted" }
        );

        const updatedRoom = await ChatRoom.findById(room._id)
            .populate("requester", "fullName email profilePicture")
            .populate("responder", "fullName email profilePicture")
            .populate("concern", "title description status");

        const io = getIO();
        io.to(room._id.toString()).emit("chatStatusUpdated", updatedRoom);

        return res.json(updatedRoom);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMyContacts,
    getChatMessages,
    sendMessage,
    updateChatStatus
};
