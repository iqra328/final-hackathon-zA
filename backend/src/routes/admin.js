const express = require('express');
const auth = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

const router = express.Router();

// ============================================
// ✅ Admin Middleware - Check if user is admin
// ============================================
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================
// 🟢 GET ALL USERS
// ============================================
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============================================
// 🟢 UPDATE USER
// ============================================
router.put('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ============================================
// 🟢 DELETE USER
// ============================================
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin user' });
    }
    
    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// 🟢 DELETE TICKET
// ============================================
router.delete('/tickets/:id', auth, isAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    await ticket.deleteOne();
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// ============================================
// 🟢 UPDATE TICKET STATUS (Admin)
// ============================================
router.put('/tickets/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    ticket.status = status;
    await ticket.save();
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// ============================================
// 🟢 GET SYSTEM STATS
// ============================================
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ 
      status: { $in: ['New', 'Assigned', 'In Progress'] } 
    });
    const completedTickets = await Ticket.countDocuments({ status: 'Completed' });
    
    res.json({
      totalUsers,
      totalTickets,
      openTickets,
      completedTickets,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;