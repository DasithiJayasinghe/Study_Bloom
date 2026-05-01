const Folder = require('../models/PersonalFolder');
const StudyGem = require('../models/StudyGem');

// @desc Get all folders for currently logged-in user
// @route GET /api/folders
// @access Private
exports.getFolders = async (req, res) => {
    try {
        const folders = await Folder.find({ user: req.user._id });
        res.status(200).json({
            success: true,
            count: folders.length,
            data: folders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Get single folder
// @route GET /api/folders/:id
// @access Private
exports.getFolder = async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Ensure user owns folder
        if (folder.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this folder'
            });
        }

        res.status(200).json({
            success: true,
            data: folder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Create new folder
// @route POST /api/folders
// @access Private
exports.createFolder = async (req, res) => {
    try {
        const { name, icon, color } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a folder name'
            });
        }

        // Check if folder name is unique for this user
        const existingFolder = await Folder.findOne({ name, user: req.user._id });
        if (existingFolder) {
            return res.status(400).json({
                success: false,
                message: 'A folder with this name already exists'
            });
        }

        const folder = await Folder.create({
            name,
            icon,
            color,
            user: req.user._id
        });

        res.status(201).json({
            success: true,
            data: folder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Delete folder
// @route DELETE /api/folders/:id
// @access Private
exports.deleteFolder = async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Ensure user owns folder
        if (folder.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to delete this folder'
            });
        }

        // Cascade delete gems inside folder
        await StudyGem.deleteMany({ folder: folder._id });
        await folder.deleteOne();

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

// @desc Update folder
// @route PUT /api/folders/:id
// @access Private
exports.updateFolder = async (req, res) => {
    try {
        let folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Ensure user owns folder
        if (folder.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this folder'
            });
        }

        folder = await Folder.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: folder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
