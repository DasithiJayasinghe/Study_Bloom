const express = require("express");
const router = express.Router();
const {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost,
    addComment,
    getComments,
    deleteComment,
    votePost,
    votePoll,
} = require("../controllers/communityController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Post routes
router.post("/posts", protect, upload.single("attachment"), createPost);
router.get("/posts", protect, getAllPosts);
router.get("/posts/:id", protect, getPostById);
router.put("/posts/:id", protect, upload.single("attachment"), updatePost);
router.delete("/posts/:id", protect, deletePost);

// Comment routes
router.post("/posts/:id/comments", protect, upload.single("attachment"), addComment);
router.get("/posts/:id/comments", protect, getComments);
router.delete("/posts/:id/comments/:commentId", protect, deleteComment);

// Vote routes
router.post("/posts/:id/vote", protect, votePost);

// Poll vote routes
router.post("/posts/:id/poll-vote", protect, votePoll);

module.exports = router;
