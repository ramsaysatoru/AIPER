const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load env variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.FRONTEND_URL || '*';
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Make io accessible globally via the request object
app.set('io', io);
const { setNotifierIo } = require('./utils/notifier');
setNotifierIo(io);

// Socket connection listener
io.on('connection', (socket) => {
  console.log('Client connected to WebSockets:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Middleware
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/parameters', require('./routes/parameterRoutes'));
app.use('/api/parameter-groups', require('./routes/parameterGroupRoutes'));
app.use('/api/sample-transfers', require('./routes/sampleTransferRoutes'));
app.use('/api/bug-reports', require('./routes/bugReportRoutes'));
app.use('/api/data-settings', require('./routes/dataSettingsRoutes'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      // Drop legacy unique index on sampleSerial if it exists (allows retests to share serial)
      mongoose.connection.db.collection('jobs').dropIndex('sampleSerial_1').catch(() => {});
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
