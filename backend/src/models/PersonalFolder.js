const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a folder name'],
        trim: true,
    },
    icon: {
        type: String,
        default: 'folder',
    },
    color: {
        type: String,
        default: '#9C27B0',
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    collection: 'personal_folders',
});

module.exports = mongoose.model('PersonalFolder', folderSchema);
