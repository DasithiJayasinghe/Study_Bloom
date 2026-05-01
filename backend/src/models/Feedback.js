const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  responder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    default: null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxLength: 500
  }
}, { timestamps: true });

// Ensure a requester can only feedback a chat room once
feedbackSchema.index({ chatRoom: 1, requester: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
