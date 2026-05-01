const mongoose = require('mongoose');

const blossomExpenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Local calendar day YYYY-MM-DD */
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    /** Amount in Sri Lankan rupees (LKR), up to 2 decimal places */
    amountRupees: {
      type: Number,
      required: true,
      min: 0.01,
      max: 99_999_999.99,
    },
  },
  { timestamps: true }
);

blossomExpenseSchema.index({ user: 1, date: 1, createdAt: -1 });

module.exports = mongoose.model('BlossomExpense', blossomExpenseSchema);
