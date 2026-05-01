const mongoose = require("mongoose");

const pollVoteSchema = new mongoose.Schema(
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
        optionIndex: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// One poll vote per user per post
pollVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("PollVote", pollVoteSchema);
