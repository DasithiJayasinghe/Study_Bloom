const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Exam = require('../models/Exam');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, images, Word docs, and text files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Get all exams for user (with optional filters)
router.get('/', protect, async (req, res) => {
  try {
    const { search, filter, sortBy = 'date', sortOrder = 'asc' } = req.query;
    
    let query = { userId: req.user._id };

    // Search by subject
    if (search) {
      query.subject = { $regex: search, $options: 'i' };
    }

    // Filter repeat exams
    if (filter === 'repeat') {
      query.isRepeat = true;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get all exams first, then filter by date+time for upcoming/past
    let exams = await Exam.find(query).sort(sortOptions);
    
    // Filter by upcoming/past considering both date and time
    if (filter === 'upcoming' || filter === 'past') {
      const now = new Date();
      
      exams = exams.filter(exam => {
        // Skip exams without date (like repeat exams without date set)
        if (!exam.date) {
          return filter === 'upcoming'; // Show dateless exams in upcoming
        }
        
        // Get the exam date (stored as midnight UTC)
        const examDate = new Date(exam.date);
        
        // Extract just the date parts
        const year = examDate.getUTCFullYear();
        const month = examDate.getUTCMonth();
        const day = examDate.getUTCDate();
        
        // Parse the time
        let hours = 0, minutes = 0;
        if (exam.time) {
          const timeParts = exam.time.split(':').map(Number);
          hours = timeParts[0] || 0;
          minutes = timeParts[1] || 0;
        }
        
        // Create exam datetime in local timezone
        const examDateTime = new Date(year, month, day, hours, minutes, 0, 0);
        
        if (filter === 'upcoming') {
          // Upcoming = exam datetime is in the future
          return examDateTime.getTime() >= now.getTime();
        } else {
          // Past = exam datetime has passed
          return examDateTime.getTime() < now.getTime();
        }
      });
    }
    // filter === 'all' or undefined - return all exams

    res.json({ success: true, exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get exams for calendar (grouped by date) - MUST be before /:id route
router.get('/calendar/dates', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    const exams = await Exam.find({ userId: req.user._id, ...dateFilter })
      .select('subject date time priority progress')
      .sort({ date: 1 });

    // Group by date
    const groupedByDate = exams.reduce((acc, exam) => {
      const dateKey = exam.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(exam);
      return acc;
    }, {});

    res.json({ success: true, examsByDate: groupedByDate });
  } catch (error) {
    console.error('Get calendar dates error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single exam
router.get('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, userId: req.user._id });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create exam
router.post('/', protect, async (req, res) => {
  try {
    const { subject, date, time, location, priority, progress, notes, reminders } = req.body;

    const exam = await Exam.create({
      userId: req.user._id,
      subject,
      date,
      time,
      location,
      priority,
      progress,
      notes,
      reminders,
    });

    res.status(201).json({ success: true, exam });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update exam
router.put('/:id', protect, async (req, res) => {
  try {
    const { subject, date, time, location, priority, progress, notes, reminders, isCompleted, marks } = req.body;

    const updateData = { subject, date, time, location, priority, progress, notes, reminders, isCompleted };
    
    // Handle marks update
    if (marks !== undefined) {
      updateData.marks = marks;
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete exam
router.delete('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Delete associated files
    for (const file of exam.fileAttachments) {
      const filePath = path.join(__dirname, '../../uploads', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload file to exam
router.post('/:id/files', protect, upload.single('file'), async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, userId: req.user._id });

    if (!exam) {
      // Delete uploaded file if exam not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileAttachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    exam.fileAttachments.push(fileAttachment);
    await exam.save();

    res.status(201).json({ success: true, file: fileAttachment, exam });
  } catch (error) {
    console.error('Upload file error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Download/Get file (supports both header auth and query token)
router.get('/:id/files/:filename', async (req, res) => {
  try {
    console.log('File request for exam:', req.params.id, 'file:', req.params.filename);
    
    // Get token from header or query parameter
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      console.log('No token provided for file access');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    // Verify token
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('User not found for token');
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    const exam = await Exam.findOne({ _id: req.params.id, userId: user._id });

    if (!exam) {
      console.log('Exam not found:', req.params.id, 'for user:', user._id);
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const file = exam.fileAttachments.find(f => f.filename === req.params.filename);
    if (!file) {
      console.log('File not found in exam:', req.params.filename);
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const filePath = path.join(__dirname, '../../uploads', file.filename);
    console.log('Looking for file at:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('File does not exist on disk:', filePath);
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    console.log('Serving file:', file.originalName, 'type:', file.mimeType);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete file from exam
router.delete('/:id/files/:filename', protect, async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, userId: req.user._id });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const fileIndex = exam.fileAttachments.findIndex(f => f.filename === req.params.filename);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = exam.fileAttachments[fileIndex];
    const filePath = path.join(__dirname, '../../uploads', file.filename);

    // Remove file from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove file from exam
    exam.fileAttachments.splice(fileIndex, 1);
    await exam.save();

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update exam progress
router.patch('/:id/progress', protect, async (req, res) => {
  try {
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ success: false, message: 'Progress must be between 0 and 100' });
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { progress },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add/Update exam marks
router.patch('/:id/marks', protect, async (req, res) => {
  try {
    const { obtained, total, grade } = req.body;

    if (obtained === undefined || total === undefined) {
      return res.status(400).json({ success: false, message: 'Obtained and total marks are required' });
    }

    if (obtained < 0 || total <= 0 || obtained > total) {
      return res.status(400).json({ success: false, message: 'Invalid marks values' });
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 
        marks: {
          obtained,
          total,
          grade: grade || undefined,
          addedAt: new Date(),
        }
      },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Update marks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle repeat exam status
router.patch('/:id/repeat', protect, async (req, res) => {
  try {
    const { isRepeat } = req.body;

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRepeat: isRepeat },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Toggle repeat error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a repeat exam from an existing exam
router.post('/:id/create-repeat', protect, async (req, res) => {
  try {
    const originalExam = await Exam.findOne({ _id: req.params.id, userId: req.user._id });

    if (!originalExam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Create a new repeat exam with just the subject and reference to original
    const repeatExam = new Exam({
      userId: req.user._id,
      subject: `${originalExam.subject} (Repeat)`,
      priority: originalExam.priority,
      notes: `Repeat exam for: ${originalExam.subject}`,
      isRepeat: true,
      originalExamId: originalExam._id,
      progress: 0,
      // date and time are optional for repeat exams
    });

    await repeatExam.save();

    res.status(201).json({ success: true, exam: repeatExam });
  } catch (error) {
    console.error('Create repeat exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
