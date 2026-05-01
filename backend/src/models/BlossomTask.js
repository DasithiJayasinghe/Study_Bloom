const mongoose = require('mongoose');

const CATEGORIES = ['study', 'life', 'health'];

const blossomTaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, required: true, enum: CATEGORIES },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

blossomTaskSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('BlossomTask', blossomTaskSchema);
module.exports.CATEGORIES = CATEGORIES;
