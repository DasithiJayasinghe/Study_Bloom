const StudyGem = require('../models/StudyGem');

// @desc Get all study gems for user (optionally filter by folder)
// @route GET /api/gems
// @access Private
exports.getStudyGems = async (req, res) => {
    try {
        const query = { user: req.user._id };

        // Allow filtering by folder if ID provided in query params
        if (req.query.folderId) {
            query.folder = req.query.folderId;
        }

        const gems = await StudyGem.find(query).populate({ path: 'folder', select: 'name icon color', model: 'PersonalFolder' });

        res.status(200).json({
            success: true,
            count: gems.length,
            data: gems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Get single study gem
// @route GET /api/gems/:id
// @access Private
exports.getStudyGem = async (req, res) => {
    try {
        const gem = await StudyGem.findById(req.params.id).populate({ path: 'folder', select: 'name icon color', model: 'PersonalFolder' });

        if (!gem) {
            return res.status(404).json({
                success: false,
                message: 'Study gem not found'
            });
        }

        // Ensure user owns gem
        if (gem.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view this gem'
            });
        }

        res.status(200).json({
            success: true,
            data: gem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Create new study gem
// @route POST /api/gems
// @access Private
exports.createStudyGem = async (req, res) => {
    try {
        const { title, description, notes, folderId, type, tags, attachments, pollData } = req.body;

        if (!title || !folderId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide title and folderId'
            });
        }

        const gem = await StudyGem.create({
            title,
            description,
            notes,
            folder: folderId,
            user: req.user._id,
            type,
            tags,
            attachments,
            pollData
        });

        res.status(201).json({
            success: true,
            data: gem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Update study gem
// @route PUT /api/gems/:id
// @access Private
exports.updateStudyGem = async (req, res) => {
    try {
        let gem = await StudyGem.findById(req.params.id);

        if (!gem) {
            return res.status(404).json({
                success: false,
                message: 'Study gem not found'
            });
        }

        // Ensure user owns gem
        if (gem.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this gem'
            });
        }

        // Map folderId to folder for mongoose updating
        if (req.body.folderId) {
            req.body.folder = req.body.folderId;
            delete req.body.folderId;
        }

        gem = await StudyGem.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: gem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Delete study gem
// @route DELETE /api/gems/:id
// @access Private
exports.deleteStudyGem = async (req, res) => {
    try {
        const gem = await StudyGem.findById(req.params.id);

        if (!gem) {
            return res.status(404).json({
                success: false,
                message: 'Study gem not found'
            });
        }

        // Ensure user owns gem
        if (gem.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to delete this gem'
            });
        }

        await gem.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
