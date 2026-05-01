const express = require("express");
const router = express.Router();
const {
    createConcern,
    getDashboardConcerns,
    acceptConcern
} = require("../controllers/concernController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createConcern);
router.get("/dashboard", protect, getDashboardConcerns);
router.put("/:id/accept", protect, acceptConcern);

module.exports = router;