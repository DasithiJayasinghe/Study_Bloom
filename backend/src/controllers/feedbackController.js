const Feedback = require('../models/Feedback');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const mongoose = require('mongoose');

const createFeedback = async (req, res) => {
  try {
    const { chatRoomId, rating, comment } = req.body;
    
    if (!chatRoomId || !rating) {
      return res.status(400).json({ message: 'ChatRoom ID and rating are required' });
    }

    const room = await ChatRoom.findById(chatRoomId);
    if (!room) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    if (room.status !== 'complete') {
      return res.status(400).json({ message: 'Can only submit feedback for completed chats' });
    }

    // Only requester can give feedback
    if (req.user._id.toString() !== room.requester.toString()) {
      return res.status(403).json({ message: 'Only the requester can submit feedback' });
    }

    const existingFeedback = await Feedback.findOne({
      chatRoom: chatRoomId,
      requester: req.user._id
    });
    
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already submitted for this chat' });
    }

    const feedback = await Feedback.create({
      responder: room.responder,
      requester: req.user._id,
      chatRoom: chatRoomId,
      // Keep legacy `room` populated while existing Mongo indexes still depend on it.
      room: chatRoomId,
      rating,
      comment
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Create feedback failed:', error);
    res.status(500).json({ message: error.message });
  }
};

const getResponderFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ responder: req.params.userId })
      .populate('requester', 'fullName profilePicture')
      .sort({ createdAt: -1 });

    const stats = await Feedback.aggregate([
      { $match: { responder: new mongoose.Types.ObjectId(req.params.userId) } },
      { 
        $group: { 
          _id: null, 
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        } 
      }
    ]);

    res.json({
      feedbacks,
      ratingStats: {
        average: stats.length > 0 ? parseFloat(stats[0].averageRating.toFixed(1)) : 0,
        count: stats.length > 0 ? stats[0].totalReviews : 0
      }
    });
  } catch (error) {
    console.error('Get responder feedback failed:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createFeedback, getResponderFeedback };
