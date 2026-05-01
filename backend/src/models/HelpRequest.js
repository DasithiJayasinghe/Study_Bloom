const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    questionTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    questionDetails: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    attachments: [
      {
        type: String,
      },
    ],
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["open", "accepted", "resolved", "deleted"],
      default: "open",
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    concernRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Concern",
      default: null,
    },
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("HelpRequest", helpRequestSchema);