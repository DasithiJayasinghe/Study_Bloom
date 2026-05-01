const mongoose = require('mongoose');

const MOOD_IDS = ['stressed', 'sad', 'meh', 'happy', 'amazing'];

const moodEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    moodId: {
      type: String,
      required: true,
      enum: MOOD_IDS,
    },
    note: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    /** Stored as UTC; client maps to local for “today” */
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('MoodEntry', moodEntrySchema);
module.exports.MOOD_IDS = MOOD_IDS;
