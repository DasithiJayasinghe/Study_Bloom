const mongoose = require('mongoose');

const FILTERS = ['goals', 'habits', 'mood'];
const KINDS = ['pdf', 'image'];

const blossomFileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 500 },
    meta: { type: String, default: '' },
    emoji: { type: String, default: '📎' },
    tag: { type: String, required: true },
    filter: { type: String, required: true, enum: FILTERS },
    kind: { type: String, required: true, enum: KINDS },
  },
  { timestamps: true }
);

blossomFileSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('BlossomFile', blossomFileSchema);
module.exports.FILTERS = FILTERS;
module.exports.KINDS = KINDS;
