const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    duration: {
        type: Number,
        required: [true, 'Please add a duration in seconds'],
    },
    folder: {
        type: mongoose.Schema.ObjectId,
        ref: 'Folder',
    },
    startTime: {
        type: Date,
        default: Date.now,
    },
    endTime: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,
    collection: 'study_sessions'
});

module.exports = mongoose.model('StudySession', studySessionSchema);
