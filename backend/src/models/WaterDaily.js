const mongoose = require('mongoose');

const waterDailySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Local calendar day YYYY-MM-DD (client timezone) */
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
    },
    totalMl: {
      type: Number,
      default: 0,
      min: 0,
      max: 20000,
    },
  },
  { timestamps: true }
);

waterDailySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WaterDaily', waterDailySchema);
