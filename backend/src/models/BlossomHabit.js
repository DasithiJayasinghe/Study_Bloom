const mongoose = require('mongoose');

const blossomHabitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    streak: { type: Number, default: 0, min: 0 },
    lastCompletedDate: { type: String, default: null },
  },
  { timestamps: true }
);

blossomHabitSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('BlossomHabit', blossomHabitSchema);
