const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ============================================
// ✅ DISABLE ALL MONGOOSE WARNINGS
// ============================================

mongoose.set('strictQuery', false);

const originalWarn = console.warn;
console.warn = function() {
  const args = Array.from(arguments);
  const msg = args.join(' ');
  
  if (msg.includes('Duplicate schema index')) return;
  if (msg.includes('MONGOOSE')) return;
  if (msg.includes('index: true')) return;
  if (msg.includes('schema.index()')) return;
  
  originalWarn.apply(console, arguments);
};

process.removeAllListeners('warning');
process.on('warning', () => {});

// ============================================
// ✅ CORS Configuration - COMPLETE
// ============================================
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://ticketing-app-s0fx.onrender.com',
    'https://ticketing-frontend.onrender.com',
    'https://storied-mousse-1279ad.netlify.app',
    'https://ticketing-app-s0fx.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// ============================================
// ✅ Socket.IO Setup - COMPLETE
// ============================================
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',
      'https://ticketing-app-s0fx.onrender.com',
      'https://ticketing-frontend.onrender.com',
      'https://storied-mousse-1279ad.netlify.app',
      'https://ticketing-app-s0fx.netlify.app'
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// ============================================
// ✅ Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('io', io);

// ============================================
// ✅ Socket.IO Events
// ============================================
io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
      socket.join(`user_${decoded.userId}`);
      socket.userId = decoded.userId;
    } catch (error) {
      console.warn('Socket authentication failed');
    }
  }
  
  socket.on('join-ticket', (ticketId) => {
    socket.join(`ticket-${ticketId}`);
    console.log(`Socket joined ticket-${ticketId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

// ============================================
// ✅ Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// ============================================
// ✅ 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// ✅ Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// ============================================
// ✅ MongoDB Connection
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Iqra:iqra123@cluster0.penjfdf.mongodb.net/ticketing?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully to Atlas');
  console.log('📦 Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// ============================================
// ✅ Server Start
// ============================================
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ============================================
// ✅ Export for Testing
// ============================================
module.exports = { app, server, io };