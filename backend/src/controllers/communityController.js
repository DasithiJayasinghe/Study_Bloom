const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Vote = require("../models/Vote");
const PollVote = require("../models/PollVote");
const Notification = require("../models/Notification");

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { title, content, type, subject, pollOptions } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        const postData = {
            title: title.trim(),
            content: content ? content.trim() : "",
            type: type || "question",
            subject: subject ? subject.trim() : "",
            user: req.user._id,
        };

        // Handle file upload
        if (req.file) {
            postData.fileURL = `/uploads/${req.file.filename}`;
        }

        // Handle poll options
        if (type === "poll" && pollOptions) {
            const options = typeof pollOptions === "string" ? JSON.parse(pollOptions) : pollOptions;
            postData.pollOptions = options
                .filter((opt) => opt && opt.trim())
                .map((opt) => ({ optionText: opt.trim(), voteCount: 0 }));
        }

        const post = await Post.create(postData);
        const populated = await Post.findById(post._id).populate("user", "fullName profilePicture");

        res.status(201).json({ success: true, post: populated });
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all posts (with search, filter, sort)
exports.getAllPosts = async (req, res) => {
    try {
        const { search, type, subject, sort } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
            ];
        }

        // Filter to current user's posts only
        if (req.query.mine === "true") {
            filter.user = req.user._id;
        }

        if (type && type !== "all") {
            filter.type = type.toLowerCase();
        }

        if (subject) {
            filter.subject = { $regex: subject, $options: "i" };
        }

        let sortOption = { createdAt: -1 }; // default: newest
        if (sort === "upvoted") {
            sortOption = { upvotes: -1, createdAt: -1 };
        }
        if (sort === "trending") {
            // Top upvoted posts from the current calendar month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            filter.createdAt = { $gte: startOfMonth };
            sortOption = { upvotes: -1, createdAt: -1 };
        }

        const posts = await Post.find(filter)
            .populate("user", "fullName profilePicture")
            .sort(sortOption)
            .lean();

        // Attach user vote info if authenticated
        if (req.user) {
            const postIds = posts.map((p) => p._id);
            const votes = await Vote.find({ postId: { $in: postIds }, userId: req.user._id }).lean();
            const voteMap = {};
            votes.forEach((v) => {
                voteMap[v.postId.toString()] = v.type;
            });
            posts.forEach((p) => {
                p.userVote = voteMap[p._id.toString()] || null;
            });
        }

        // Mark own posts
        if (req.user) {
            posts.forEach((p) => {
                p.isOwn = p.user._id.toString() === req.user._id.toString();
            });
        }

        res.status(200).json({ success: true, posts });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single post by ID
exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("user", "fullName profilePicture")
            .lean();

        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        // Get user vote and mark ownership
        if (req.user) {
            post.isOwn = post.user._id.toString() === req.user._id.toString();

            const vote = await Vote.findOne({ postId: post._id, userId: req.user._id });
            post.userVote = vote ? vote.type : null;

            // Get user poll vote
            if (post.type === "poll") {
                const pollVote = await PollVote.findOne({ postId: post._id, userId: req.user._id });
                post.userPollVote = pollVote ? pollVote.optionIndex : null;
            }
        }

        res.status(200).json({ success: true, post });
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update post
exports.updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const { title, content, subject } = req.body;
        if (title) post.title = title.trim();
        if (content !== undefined) post.content = content.trim();
        if (subject !== undefined) post.subject = subject.trim();

        if (req.file) {
            post.fileURL = `/uploads/${req.file.filename}`;
        }

        await post.save();
        const populated = await Post.findById(post._id).populate("user", "fullName profilePicture");

        res.status(200).json({ success: true, post: populated });
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete post
exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        await Comment.deleteMany({ postId: post._id });
        await Vote.deleteMany({ postId: post._id });
        await PollVote.deleteMany({ postId: post._id });
        await Post.findByIdAndDelete(post._id);

        res.status(200).json({ success: true, message: "Post deleted" });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add comment
exports.addComment = async (req, res) => {
    try {
        const { content, parentComment } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: "Comment content is required" });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        const commentData = {
            postId: post._id,
            userId: req.user._id,
            content: content.trim(),
        };

        if (parentComment) {
            commentData.parentComment = parentComment;
        }

        if (req.file) {
            commentData.fileURL = `/uploads/${req.file.filename}`;
        }

        const comment = await Comment.create(commentData);

        // Increment comment count
        post.commentCount = (post.commentCount || 0) + 1;
        await post.save();

        const populated = await Comment.findById(comment._id).populate("userId", "fullName profilePicture");

        // Create notification for post owner (if not the same person)
        if (post.user.toString() !== req.user._id.toString()) {
            await Notification.create({
                recipient: post.user,
                sender: req.user._id,
                type: 'new_comment',
                postId: post._id,
                title: 'New Comment',
                body: `${req.user.fullName} commented on your post: "${post.title}"`
            });
        }

        // Create notification for parent comment owner on replies
        if (parentComment) {
            const parent = await Comment.findById(parentComment);
            if (parent && parent.userId.toString() !== req.user._id.toString()) {
                await Notification.create({
                    recipient: parent.userId,
                    sender: req.user._id,
                    type: 'new_comment',
                    postId: post._id,
                    title: 'New Reply',
                    body: `${req.user.fullName} replied to your comment: "${parent.content.substring(0, 30)}..."`
                });
            }
        }

        res.status(201).json({ success: true, comment: populated });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get comments for a post
exports.getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ postId: req.params.id })
            .populate("userId", "fullName profilePicture")
            .sort({ createdAt: -1 })
            .lean();

        // Mark own comments
        if (req.user) {
            comments.forEach((c) => {
                c.isOwn = c.userId._id.toString() === req.user._id.toString();
            });
        }

        res.status(200).json({ success: true, comments });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete comment
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ success: false, message: "Comment not found" });
        }

        if (comment.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        await Comment.findByIdAndDelete(comment._id);

        // Decrement comment count
        await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });

        res.status(200).json({ success: true, message: "Comment deleted" });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Vote on a post (upvote / downvote)
exports.votePost = async (req, res) => {
    try {
        const { type } = req.body; // "upvote" or "downvote"

        if (!["upvote", "downvote"].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid vote type" });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        const existingVote = await Vote.findOne({ postId: post._id, userId: req.user._id });

        if (existingVote) {
            if (existingVote.type === type) {
                // Remove vote (toggle off)
                if (type === "upvote") post.upvotes = Math.max(0, post.upvotes - 1);
                else post.downvotes = Math.max(0, post.downvotes - 1);
                await existingVote.deleteOne();
            } else {
                // Switch vote
                if (type === "upvote") {
                    post.upvotes += 1;
                    post.downvotes = Math.max(0, post.downvotes - 1);
                } else {
                    post.downvotes += 1;
                    post.upvotes = Math.max(0, post.upvotes - 1);
                }
                existingVote.type = type;
                await existingVote.save();
            }
        } else {
            // New vote
            await Vote.create({ postId: post._id, userId: req.user._id, type });
            if (type === "upvote") post.upvotes += 1;
            else post.downvotes += 1;
        }

        await post.save();

        res.status(200).json({
            success: true,
            upvotes: post.upvotes,
            downvotes: post.downvotes,
            userVote: (await Vote.findOne({ postId: post._id, userId: req.user._id }))?.type || null,
        });
    } catch (error) {
        console.error("Error voting:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Vote on a poll option
exports.votePoll = async (req, res) => {
    try {
        const { optionIndex } = req.body;

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        if (post.type !== "poll") {
            return res.status(400).json({ success: false, message: "Post is not a poll" });
        }

        if (optionIndex < 0 || optionIndex >= post.pollOptions.length) {
            return res.status(400).json({ success: false, message: "Invalid option index" });
        }

        const existingVote = await PollVote.findOne({ postId: post._id, userId: req.user._id });

        if (existingVote) {
            // Switch vote
            const oldIndex = existingVote.optionIndex;
            if (post.pollOptions[oldIndex]) {
                post.pollOptions[oldIndex].voteCount = Math.max(0, post.pollOptions[oldIndex].voteCount - 1);
            }
            post.pollOptions[optionIndex].voteCount += 1;
            existingVote.optionIndex = optionIndex;
            await existingVote.save();
        } else {
            // New vote
            await PollVote.create({ postId: post._id, userId: req.user._id, optionIndex });
            post.pollOptions[optionIndex].voteCount += 1;
        }

        await post.save();

        res.status(200).json({
            success: true,
            pollOptions: post.pollOptions,
            userPollVote: optionIndex,
        });
    } catch (error) {
        console.error("Error voting on poll:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
