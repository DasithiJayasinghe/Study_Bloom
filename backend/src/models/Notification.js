const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['new_comment', 'post_like', 'exam_today', 'exam_tomorrow', 'help_request_accepted'], 
    required: true 
  },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  helpRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'HelpRequest' },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
