const Concern = require("../models/Concern");
const ChatRoom = require("../models/ChatRoom");

const createConcern = async (req, res) => {
    try {
        const { title, description, category } = req.body;

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ 
                message: "Title and description are required" 
            });
        }

        const concern = await Concern.create({
            requester: req.user._id,
            title,
            description,
            category
        });

        return res.status(201).json(concern);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getDashboardConcerns = async (req, res) => {
    try {
        const concerns = await Concern.find()
            .populate("requester", "name email avatar")
            .populate("acceptedBy", "name email avatar")
            .sort({ createdAt: -1 });

        return res.json(concerns);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const acceptConcern = async (req, res) => {
    try {
        const concern = await Concern.findById(req.params.id);

        if (!concern) {
            return res.status(404).json({ message: "Concern not found" });
        }

        if (concern.status !== "open") {
            return res.status(400).json({ message: "Concern already accepted or completed" });
        }

        if (concern.requester.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "Cannot accept your own concern" });
        }

        concern.acceptedBy = req.user._id;
        concern.status = "accepted";
        concern.acceptedAt = new Date();
        await concern.save();

        let room;
        try {
            room = await ChatRoom.create({
                concern: concern._id,
                requester: concern.requester,
                responder: req.user._id,
                status: "pending"
            });
        } catch (chatError) {
            // Revert concern state if chat room creation fails
            concern.status = "open";
            concern.acceptedBy = null;
            concern.acceptedAt = null;
            await concern.save();
            throw new Error(`Failed to create chat room: ${chatError.message}`);
        }

        const populatedConcern = await Concern.findById(concern._id)
            .populate("requester", "name email avatar")
            .populate("acceptedBy", "name email avatar");

        return res.json({
            message: "Concern accepted successfully",
            concern: populatedConcern,
            room
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createConcern,
    getDashboardConcerns,
    acceptConcern
};