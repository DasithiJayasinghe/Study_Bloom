const Folder = require("../models/Folder");
const HelpRequest = require('../models/HelpRequest');

// @desc    Create folder
// @route   POST /api/folders
// @access  Private
const createFolder = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const existingFolder = await Folder.findOne({
      user: req.user._id,
      name: name.trim(),
    });

    if (existingFolder) {
      return res.status(400).json({ message: "Folder already exists" });
    }

    const folder = await Folder.create({
      user: req.user._id,
      name: name.trim(),
    });

    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create folder",
      error: error.message,
    });
  }
};

// @desc    Get my folders
// @route   GET /api/folders/my
// @access  Private
const getMyFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(folders);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch folders",
      error: error.message,
    });
  }
};

// @desc    Get folder by id
// @route   GET /api/folders/:id
// @access  Private
const getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (folder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this folder" });
    }

    res.status(200).json(folder);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch folder",
      error: error.message,
    });
  }
};

const updateFolder = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this folder' });
    }

    folder.name = name.trim();
    await folder.save();

    res.status(200).json(folder);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update folder',
      error: error.message,
    });
  }
};

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private
const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this folder' });
    }

    const requestsInFolder = await HelpRequest.find({
      folder: folder._id,
      user: req.user._id,
    });

    if (requestsInFolder.length > 0) {
      return res.status(400).json({
        message: 'This folder cannot be deleted because it contains requests',
      });
    }

    await folder.deleteOne();

    res.status(200).json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete folder',
      error: error.message,
    });
  }
};

module.exports = {
  createFolder,
  getMyFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
};