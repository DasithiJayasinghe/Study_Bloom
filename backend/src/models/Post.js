const mongoose = require("mongoose");

const pollOptionSchema = new mongoose.Schema(
  {
    optionText: {
      type: String,
      required: true,
      trim: true,
    },
    voteCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ["question", "material", "discussion", "poll"],
      required: true,
      default: "question",
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    fileURL: {
      type: String,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pollOptions: [pollOptionSchema],
    upvotes: {
      type: Number,
      default: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
postSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("Post", postSchema);
