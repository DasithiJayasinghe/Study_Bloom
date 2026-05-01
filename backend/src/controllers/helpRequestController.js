const HelpRequest = require("../models/HelpRequest");
const Folder = require("../models/Folder");
const Concern = require("../models/Concern");
const ChatRoom = require("../models/ChatRoom");

const ensureChatResourcesForRequest = async (requestDoc) => {
  if (!requestDoc) return { concern: null, room: null };
  if (!requestDoc.acceptedBy || !["accepted", "resolved"].includes(requestDoc.status)) {
    return { concern: null, room: null };
  }

  let concern = null;
  if (requestDoc.concernRef) {
    concern = await Concern.findById(requestDoc.concernRef);
  }

  if (!concern) {
    concern = await Concern.create({
      requester: requestDoc.user,
      title: requestDoc.questionTitle,
      description: requestDoc.questionDetails,
      category: requestDoc.subject || "general",
      acceptedBy: requestDoc.acceptedBy,
      status: requestDoc.status === "resolved" ? "complete" : "accepted",
      acceptedAt: requestDoc.updatedAt || new Date(),
      completedAt: requestDoc.status === "resolved" ? (requestDoc.updatedAt || new Date()) : null,
    });
    requestDoc.concernRef = concern._id;
  }

  let room = null;
  if (requestDoc.chatRoom) {
    room = await ChatRoom.findById(requestDoc.chatRoom);
  }

  if (!room) {
    room = await ChatRoom.create({
      concern: concern._id,
      requester: requestDoc.user,
      responder: requestDoc.acceptedBy,
      status: requestDoc.status === "resolved" ? "complete" : "pending",
      closedBy: requestDoc.status === "resolved" ? requestDoc.acceptedBy : null,
    });
    requestDoc.chatRoom = room._id;
  }

  await requestDoc.save();
  return { concern, room };
};

// @desc    Create help request
// @route   POST /api/help-requests
// @access  Private
const createHelpRequest = async (req, res) => {
  try {
    const { subject, questionTitle, questionDetails, folder, isUrgent } = req.body;

    if (!subject || !questionTitle || !questionDetails) {
      return res.status(400).json({
        message: "Subject, question title, and question details are required",
      });
    }

    if (folder) {
      const existingFolder = await Folder.findById(folder);

      if (!existingFolder) {
        return res.status(404).json({ message: "Folder not found" });
      }

      if (existingFolder.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to use this folder" });
      }
    }

    const uploadedFiles = req.files
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : [];

    const helpRequest = await HelpRequest.create({
      user: req.user._id,
      subject: subject.trim(),
      questionTitle: questionTitle.trim(),
      questionDetails: questionDetails.trim(),
      folder: folder || null,
      isUrgent: isUrgent === "true" || isUrgent === true,
      attachments: uploadedFiles,
    });

    const populatedRequest = await HelpRequest.findById(helpRequest._id)
      .populate("user", "fullName email profilePicture")
      .populate("folder", "name");

    res.status(201).json(populatedRequest);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create help request",
      error: error.message,
    });
  }
};

// @desc    Get my help requests
// @route   GET /api/help-requests/my
// @access  Private
const getMyHelpRequests = async (req, res) => {
  try {
    const requests = await HelpRequest.find({
      user: req.user._id,
      status: { $ne: "deleted" },
    })
      .populate("folder", "name")
      .populate("acceptedBy", "fullName email profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch your help requests",
      error: error.message,
    });
  }
};

// @desc    Get help feed
// @route   GET /api/help-requests/feed
// @access  Private
const getHelpFeed = async (req, res) => {
  try {
    const requests = await HelpRequest.find({
      status: "open",
    })
      .populate("user", "fullName email profilePicture")
      .populate("folder", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch help feed",
      error: error.message,
    });
  }
};

// @desc    Get help request by id
// @route   GET /api/help-requests/:id
// @access  Private
const getHelpRequestById = async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id)
      .populate("user", "fullName email profilePicture")
      .populate("folder", "name")
      .populate("acceptedBy", "fullName email profilePicture");

    if (!request || request.status === "deleted") {
      return res.status(404).json({ message: "Help request not found" });
    }

    await ensureChatResourcesForRequest(request);

    const refreshedRequest = await HelpRequest.findById(request._id)
      .populate("user", "fullName email profilePicture")
      .populate("folder", "name")
      .populate("acceptedBy", "fullName email profilePicture")
      .populate("chatRoom");

    res.status(200).json(refreshedRequest);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch help request",
      error: error.message,
    });
  }
};

// @desc    Delete help request
// @route   DELETE /api/help-requests/:id
// @access  Private
const deleteHelpRequest = async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Help request not found' });
    }

    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this request' });
    }

    if (request.status !== 'open' && request.status !== 'resolved') {
      return res.status(400).json({
        message: 'Only open or resolved requests can be deleted',
      });
    }

    await request.deleteOne();

    res.status(200).json({ message: 'Help request deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete help request',
      error: error.message,
    });
  }
};

// @desc    Accept help request
// @route   PATCH /api/help-requests/:id/accept
// @access  Private
const acceptHelpRequest = async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request || request.status === "deleted") {
      return res.status(404).json({ message: "Help request not found" });
    }

    // Owner cannot accept own request
    if (request.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot accept your own help request",
      });
    }

    // Already accepted/resolved requests cannot be accepted again
    if (request.acceptedBy || request.status !== "open") {
      return res.status(400).json({
        message: "This help request has already been accepted or is no longer open",
      });
    }

    request.acceptedBy = req.user._id;
    request.status = "accepted";

    let concern = null;
    if (request.concernRef) {
      concern = await Concern.findById(request.concernRef);
    }

    if (!concern) {
      concern = await Concern.create({
        requester: request.user,
        title: request.questionTitle,
        description: request.questionDetails,
        category: request.subject || "general",
        acceptedBy: req.user._id,
        status: "accepted",
        acceptedAt: new Date(),
      });
      request.concernRef = concern._id;
    }

    let room = null;
    if (request.chatRoom) {
      room = await ChatRoom.findById(request.chatRoom);
    }

    if (!room) {
      room = await ChatRoom.create({
        concern: concern._id,
        requester: request.user,
        responder: req.user._id,
        status: "pending",
      });
      request.chatRoom = room._id;
    }

    await request.save();

    const updatedRequest = await HelpRequest.findById(request._id)
      .populate("user", "fullName email profilePicture")
      .populate("folder", "name")
      .populate("acceptedBy", "fullName email profilePicture")
      .populate("chatRoom");

    res.status(200).json({
      message: "Help request accepted successfully",
      request: updatedRequest,
      room,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to accept help request",
      error: error.message,
    });
  }
};

// @desc    Update help request status
// @route   PATCH /api/help-requests/:id/status
// @access  Private
const updateHelpRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // For now allow only resolved through this route
    if (status !== "resolved") {
      return res.status(400).json({
        message: "Only 'resolved' status update is allowed through this route",
      });
    }

    const request = await HelpRequest.findById(req.params.id);

    if (!request || request.status === "deleted") {
      return res.status(404).json({ message: "Help request not found" });
    }

    // Only request owner can mark as resolved
    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to update this help request status",
      });
    }

    // Request should be accepted before resolving
    if (request.status !== "accepted") {
      return res.status(400).json({
        message: "Only accepted requests can be marked as resolved",
      });
    }

    request.status = "resolved";
    await request.save();

    const updatedRequest = await HelpRequest.findById(request._id)
      .populate("user", "fullName email profilePicture")
      .populate("folder", "name")
      .populate("acceptedBy", "fullName email profilePicture");

    res.status(200).json({
      message: "Help request marked as resolved",
      request: updatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update help request status",
      error: error.message,
    });
  }
};

// @desc    Remove folder from help request
// @route   PATCH /api/help-requests/:id/remove-folder
// @access  Private
const removeFolderFromHelpRequest = async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request || request.status === "deleted") {
      return res.status(404).json({ message: "Help request not found" });
    }

    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to update this help request",
      });
    }

    request.folder = null;
    await request.save();

    const updatedRequest = await HelpRequest.findById(request._id)
      .populate("user", "fullName email profilePicture")
      .populate("folder", "name")
      .populate("acceptedBy", "fullName email profilePicture");

    res.status(200).json({
      message: "Folder removed from help request",
      request: updatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove folder from help request",
      error: error.message,
    });
  }
};

module.exports = {
  createHelpRequest,
  getMyHelpRequests,
  getHelpFeed,
  getHelpRequestById,
  deleteHelpRequest,
  acceptHelpRequest,
  updateHelpRequestStatus,
  removeFolderFromHelpRequest,
};