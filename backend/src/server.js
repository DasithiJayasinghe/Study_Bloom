const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const folderRoutes = require("./routes/folderRoutes");
const helpRequestRoutes = require("./routes/helpRequestRoutes");
const communityRoutes = require("./routes/communityRoutes");
const blossomRoutes = require('./routes/blossomRoutes');
const chatRoutes = require('./routes/chatRoutes');
const concernRoutes = require('./routes/concernRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { protect } = require('./middleware/authMiddleware');
const http = require('http');
const { initSocket } = require('./config/socket');

// Load backend/.env explicitly so this works from workspace root.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Study Bloom backend is running',
  });
});

// Auth routes
console.log('Mounting auth routes at /api/auth');
app.use('/api/auth', authRoutes);
console.log('Auth routes mounted successfully');

// User routes
const { getUserById } = require('./controllers/authController');
app.get('/api/users/:id', protect, getUserById);

// Exam routes
console.log('Mounting exam routes at /api/exams');
app.use('/api/exams', examRoutes);
console.log('Exam routes mounted successfully');

// Folder routes
console.log('Mounting folder routes at /api/folders');
app.use('/api/folders', folderRoutes);
console.log('Folder routes mounted successfully');

// Help request routes
console.log("Mounting help request routes at /api/help-requests");
app.use("/api/help-requests", helpRequestRoutes);
console.log("Help request routes mounted successfully");

// Community routes
console.log("Mounting community routes at /api/community");
app.use("/api/community", communityRoutes);
console.log("Community routes mounted successfully");

// Blossom Routine routes
console.log('Mounting blossom routes at /api/blossom');
app.use('/api/blossom', blossomRoutes);
console.log('Blossom routes mounted successfully');

// Chat & Concern & Feedback routes
console.log('Mounting chat routes at /api/chat');
app.use('/api/chat', chatRoutes);
console.log('Mounting concern routes at /api/concerns');
app.use('/api/concerns', concernRoutes);
console.log('Mounting feedback routes at /api/feedback');
app.use('/api/feedback', feedbackRoutes);
console.log('Mounting notification routes at /api/notifications');
app.use('/api/notifications', notificationRoutes);

// Study Space routes
const personalFolderRoutes = require('./routes/personalFolderRoutes');
const studyGemRoutes = require('./routes/studyGemRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

app.use('/api/personal-folders', personalFolderRoutes);
app.use('/api/gems', studyGemRoutes);
app.use('/api/sessions', sessionRoutes);

// Dev route - list all users (remove in production)
app.get('/api/users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected route example - test endpoint
app.get('/api/profile', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      profilePicture: req.user.profilePicture,
      createdAt: req.user.createdAt
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  // Listen on all network interfaces (0.0.0.0) so phone can connect
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://0.0.0.0:${PORT} (use your computer's IP)`);
  });
};

startServer();
