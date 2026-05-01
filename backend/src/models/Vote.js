const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
    {
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["upvote", "downvote"],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// One vote per user per post
voteSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
