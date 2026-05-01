const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema(
    {
        concern: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Concern",
            required: true,
            unique: true
        },
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        responder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "complete"],
            default: "pending"
        },
        closedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ChatRoom", chatRoomSchema);