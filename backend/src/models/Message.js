const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
    {
        fileName: String,
        fileUrl: String,
        fileType: {
            type: String,
            enum: ["image", "pdf", "csv", "audio", "other"],
            default: "other"
        },
        mimeType: String,
        size: Number
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatRoom",
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            default: ""
        },
        attachments: [attachmentSchema],
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);