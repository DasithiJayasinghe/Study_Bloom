const mongoose = require('mongoose');

const studyGemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    notes: {
        type: String,
    },
    folder: {
        type: mongoose.Schema.ObjectId,
        ref: 'PersonalFolder',
        required: true,
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['community', 'manual'],
        default: 'manual',
    },
    tags: [String],
    attachments: [{
        name: String,
        url: String,
        fileType: String,
    }],
    pollData: [{
        optionText: String,
        voteCount: Number,
    }],
}, {
    timestamps: true,
});

module.exports = mongoose.model('StudyGem', studyGemSchema);
