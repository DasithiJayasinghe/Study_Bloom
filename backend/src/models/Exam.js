const mongoose = require('mongoose');

const fileAttachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const reminderSchema = new mongoose.Schema({
  time: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['1_hour', '1_day', '3_days', '1_week', 'custom'],
    default: '1_day',
  },
  notified: {
    type: Boolean,
    default: false,
  },
});

const markSchema = new mongoose.Schema({
  obtained: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 1,
  },
  grade: {
    type: String,
    trim: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const examSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: [true, 'Please provide a subject name'],
    trim: true,
  },
  date: {
    type: Date,
    required: false, // Not required for repeat exams
  },
  time: {
    type: String,
    required: false, // Not required for repeat exams
  },
  location: {
    type: String,
    trim: true,
    default: '',
  },
  priority: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
  fileAttachments: [fileAttachmentSchema],
  reminders: [reminderSchema],
  marks: markSchema,
  isCompleted: {
    type: Boolean,
    default: false,
  },
  isRepeat: {
    type: Boolean,
    default: false,
  },
  originalExamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

examSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

examSchema.index({ userId: 1, date: 1 });
examSchema.index({ userId: 1, subject: 1 });

module.exports = mongoose.model('Exam', examSchema);
