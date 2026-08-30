const express = require('express');
const auth = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { analyzeTicket } = require('../services/aiService');

const router = express.Router();

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateTicketNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `TKT-${year}${month}${day}-${random}${timestamp}`;
}

// ============================================
// 🟢 CREATE TICKET (Customer)
// ============================================
router.post('/create', auth, async (req, res) => {
  try {
    const { subject, description, category, urgencyLevel } = req.body;
    const customerId = req.user.userId;
    
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }
    
    // AI Analysis
    const aiSuggestion = await analyzeTicket(subject, description);
    
    // Get available workers
    const categoryLower = aiSuggestion.category ? aiSuggestion.category.toLowerCase() : 'general';
    let availableWorkers = await User.find({
      role: 'worker',
      isAvailable: true,
      skills: { $in: [categoryLower] }
    }).limit(5);

    if (availableWorkers.length === 0) {
      availableWorkers = await User.find({
        role: 'worker',
        isAvailable: true,
      }).limit(5);
    }

    const suggestedWorkers = availableWorkers.map(worker => ({
      workerId: worker._id,
      score: Math.floor(Math.random() * 30) + 70,
      reason: `Expert in ${aiSuggestion.category || 'General'} with ${worker.completedTasks || 0} completed tasks`
    }));

    // ✅ Create ticket
    const ticket = new Ticket({
      ticketNumber: generateTicketNumber(),
      customerId,
      subject: subject.trim(),
      description: description.trim(),
      category: category || aiSuggestion.category || 'General',
      priority: aiSuggestion.priority || 'Medium',
      urgencyLevel: urgencyLevel || 'Medium',
      status: 'New',
      aiSuggestion: {
        category: aiSuggestion.category || 'General',
        priority: aiSuggestion.priority || 'Medium',
        summary: aiSuggestion.summary || '',
        suggestedWorkers: suggestedWorkers,
        reviewed: false,
      },
      messages: [{
        sender: 'customer',
        senderId: customerId,
        message: description.trim(),
      }]
    });
    
    // ✅ Save using await
    const savedTicket = await ticket.save();
    
    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('new-ticket', { 
        ticketNumber: savedTicket.ticketNumber,
        ticketId: savedTicket._id,
      });
    }
    
    res.status(201).json(savedTicket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket: ' + error.message });
  }
});

// ============================================
// 🟢 GET ALL TICKETS (Role-based)
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    let tickets = [];
    
    if (role === 'customer') {
      tickets = await Ticket.find({ customerId: userId })
        .sort({ createdAt: -1 })
        .populate('agentId', 'name email')
        .populate('workerId', 'name email rating');
    } else if (role === 'agent') {
      tickets = await Ticket.find({
        $or: [
          { agentId: userId },
          { agentId: null, status: { $in: ['New', 'Assigned'] } }
        ]
      })
        .sort({ priority: -1, createdAt: 1 })
        .populate('customerId', 'name email')
        .populate('workerId', 'name email rating');
    } else if (role === 'worker') {
      tickets = await Ticket.find({ workerId: userId })
        .sort({ createdAt: -1 })
        .populate('customerId', 'name email')
        .populate('agentId', 'name email');
    } else if (role === 'admin') {
      tickets = await Ticket.find()
        .sort({ createdAt: -1 })
        .populate('customerId', 'name email')
        .populate('agentId', 'name email')
        .populate('workerId', 'name email rating');
    }
    
    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets: ' + error.message });
  }
});

// ============================================
// 🟢 GET SINGLE TICKET
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate('agentId', 'name email')
      .populate('workerId', 'name email rating')
      .populate('messages.senderId', 'name email')
      .populate('aiSuggestion.suggestedWorkers.workerId', 'name email rating skills');
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const { role, userId } = req.user;
    const isCustomer = role === 'customer' && ticket.customerId._id.toString() === userId;
    const isAgent = role === 'agent' && (!ticket.agentId || ticket.agentId._id.toString() === userId);
    const isWorker = role === 'worker' && ticket.workerId && ticket.workerId._id.toString() === userId;
    const isAdmin = role === 'admin';
    
    if (!isCustomer && !isAgent && !isWorker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket: ' + error.message });
  }
});

// ============================================
// 🟢 REVIEW AI SUGGESTION (Agent)
// ============================================
router.put('/:id/ai-review', auth, async (req, res) => {
  try {
    const { category, priority, summary } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!['agent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only agents can review AI suggestions' });
    }
    
    // ✅ Update AI review
    if (!ticket.aiSuggestion) {
      ticket.aiSuggestion = {};
    }
    ticket.aiSuggestion.category = category;
    ticket.aiSuggestion.priority = priority;
    ticket.aiSuggestion.summary = summary;
    ticket.aiSuggestion.reviewed = true;
    ticket.aiSuggestion.reviewedBy = req.user.userId;
    ticket.aiSuggestion.reviewedAt = new Date();
    
    ticket.category = category;
    ticket.priority = priority;
    
    await ticket.save();
    
    res.json(ticket);
  } catch (error) {
    console.error('AI review error:', error);
    res.status(500).json({ error: 'Failed to update AI suggestion: ' + error.message });
  }
});

// ============================================
// 🟢 ASSIGN AGENT TO TICKET
// ============================================
router.put('/:id/assign-agent', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!['agent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only agents can assign themselves' });
    }
    
    if (ticket.status === 'Completed' || ticket.status === 'Rejected') {
      return res.status(400).json({ error: 'Cannot assign completed/rejected ticket' });
    }
    
    // ✅ Assign agent
    ticket.agentId = req.user.userId;
    ticket.status = 'Assigned';
    ticket.assignedAt = new Date();
    await ticket.save();
    
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket-${ticket._id}`).emit('ticket-updated', ticket);
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Assign agent error:', error);
    res.status(500).json({ error: 'Failed to assign agent: ' + error.message });
  }
});

// ============================================
// 🟢 GET WORKER SUGGESTIONS (AI Powered)
// ============================================
router.get('/:id/worker-suggestions', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    let suggestions = [];
    
    if (ticket.aiSuggestion && ticket.aiSuggestion.suggestedWorkers && ticket.aiSuggestion.suggestedWorkers.length > 0) {
      const workerIds = ticket.aiSuggestion.suggestedWorkers.map(w => w.workerId);
      const workers = await User.find({ 
        _id: { $in: workerIds },
        role: 'worker',
        isAvailable: true 
      }).select('name email skills rating completedTasks');
      
      suggestions = ticket.aiSuggestion.suggestedWorkers.map(s => {
        const worker = workers.find(w => w._id.toString() === s.workerId.toString());
        return {
          workerId: s.workerId,
          name: worker?.name || 'Unknown',
          skills: worker?.skills || [],
          rating: worker?.rating?.average || 0,
          completedTasks: worker?.completedTasks || 0,
          score: s.score || 0,
          reason: s.reason || 'Suggested by AI',
        };
      }).filter(s => s.name !== 'Unknown');
    }

    if (suggestions.length === 0) {
      const category = ticket.category ? ticket.category.toLowerCase() : 'general';
      const workers = await User.find({
        role: 'worker',
        isAvailable: true,
        skills: { $in: [category] }
      }).select('name email skills rating completedTasks').limit(10);
      
      suggestions = workers.map(worker => ({
        workerId: worker._id,
        name: worker.name,
        skills: worker.skills,
        rating: worker.rating?.average || 0,
        completedTasks: worker.completedTasks || 0,
        score: Math.floor(Math.random() * 30) + 70,
        reason: `Available ${ticket.category || 'General'} specialist`
      }));
    }

    suggestions.sort((a, b) => b.score - a.score);
    res.json({ suggestions });
  } catch (error) {
    console.error('Worker suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions: ' + error.message });
  }
});

// ============================================
// 🟢 ASSIGN WORKER TO TICKET (Agent)
// ============================================
router.put('/:id/assign-worker', auth, async (req, res) => {
  try {
    const { workerId } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!['agent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only agents can assign workers' });
    }

    if (ticket.status === 'Completed' || ticket.status === 'Rejected') {
      return res.status(400).json({ error: 'Cannot assign worker to completed/rejected ticket' });
    }

    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // ✅ Assign worker
    ticket.workerId = workerId;
    ticket.status = 'Assigned';
    ticket.assignedAt = new Date();
    await ticket.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${workerId}`).emit('new-task', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        customerName: ticket.customerId?.name || 'Unknown',
      });
      io.to(`ticket-${ticket._id}`).emit('ticket-updated', ticket);
    }

    res.json(ticket);
  } catch (error) {
    console.error('Assign worker error:', error);
    res.status(500).json({ error: 'Failed to assign worker: ' + error.message });
  }
});

// ============================================
// 🟢 ADD MESSAGE
// ============================================
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    const { role, userId } = req.user;
    const sender = role === 'customer' ? 'customer' : role === 'agent' ? 'agent' : 'worker';
    
    if (role === 'customer' && ticket.customerId.toString() !== userId) {
      return res.status(403).json({ error: 'You can only comment on your own tickets' });
    }
    
    if (role === 'worker' && ticket.workerId && ticket.workerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not assigned to this ticket' });
    }
    
    if (ticket.status === 'Completed' || ticket.status === 'Rejected') {
      return res.status(400).json({ error: 'Cannot add message to completed/rejected ticket' });
    }
    
    // ✅ Add message
    ticket.messages.push({
      sender,
      senderId: userId,
      message: message.trim(),
      timestamp: new Date(),
    });
    
    // Update status
    if (sender === 'customer' && ticket.status === 'Resolved') {
      ticket.status = 'In Progress';
    } else if (sender === 'agent' && ticket.status === 'New') {
      ticket.status = 'Assigned';
      if (!ticket.agentId) {
        ticket.agentId = userId;
      }
    } else if (sender === 'worker' && ticket.status === 'Assigned') {
      ticket.status = 'In Progress';
    }
    
    await ticket.save();
    
    const io = req.app.get('io');
    const newMessage = ticket.messages[ticket.messages.length - 1];
    if (io) {
      io.to(`ticket-${ticket._id}`).emit('new-message', {
        ticketId: ticket._id,
        message: newMessage,
      });
      io.to(`user_${ticket.customerId}`).emit('new-message', {
        ticketId: ticket._id,
        message: newMessage,
      });
      if (ticket.agentId) {
        io.to(`user_${ticket.agentId}`).emit('new-message', {
          ticketId: ticket._id,
          message: newMessage,
        });
      }
      if (ticket.workerId) {
        io.to(`user_${ticket.workerId}`).emit('new-message', {
          ticketId: ticket._id,
          message: newMessage,
        });
      }
    }
    
    res.json(newMessage);
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message: ' + error.message });
  }
});

// ============================================
// 🟢 WORKER UPDATE TASK STATUS
// ============================================
router.put('/:id/worker-status', auth, async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (req.user.role !== 'worker' || ticket.workerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validStatuses = ['Accepted', 'In Progress', 'Completed', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (ticket.status === 'Completed' || ticket.status === 'Rejected') {
      return res.status(400).json({ error: 'Cannot change completed/rejected ticket' });
    }

    const statusMap = {
      'Accepted': 'Assigned',
      'In Progress': 'In Progress',
      'Completed': 'Completed',
      'Rejected': 'Rejected',
    };

    ticket.status = statusMap[status];
    
    if (status === 'Completed') {
      ticket.completedAt = new Date();
      ticket.resolvedAt = new Date();
      if (resolutionNote) {
        ticket.resolutionNote = resolutionNote;
      }
      await ticket.save();
      
      await User.findByIdAndUpdate(ticket.workerId, {
        $inc: { completedTasks: 1 }
      });
    } else if (status === 'Rejected') {
      ticket.cancelledAt = new Date();
      ticket.resolvedAt = new Date();
      if (resolutionNote) {
        ticket.resolutionNote = resolutionNote;
      }
      await ticket.save();
    } else {
      await ticket.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${ticket.customerId}`).emit('ticket-updated', ticket);
      if (ticket.agentId) {
        io.to(`user_${ticket.agentId}`).emit('ticket-updated', ticket);
      }
      io.to(`ticket-${ticket._id}`).emit('ticket-updated', ticket);
    }

    res.json(ticket);
  } catch (error) {
    console.error('Worker status update error:', error);
    res.status(500).json({ error: 'Failed to update status: ' + error.message });
  }
});

// ============================================
// 🟢 CUSTOMER CANCEL TICKET
// ============================================
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (req.user.role !== 'customer' || ticket.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (ticket.status === 'Completed' || ticket.status === 'Rejected') {
      return res.status(400).json({ error: 'Cannot cancel completed/rejected ticket' });
    }

    // ✅ Cancel ticket
    ticket.status = 'Cancelled';
    ticket.cancelledAt = new Date();
    await ticket.save();

    if (ticket.workerId) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${ticket.workerId}`).emit('ticket-cancelled', {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
        });
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error('Cancel ticket error:', error);
    res.status(500).json({ error: 'Failed to cancel ticket: ' + error.message });
  }
});

// ============================================
// 🟢 SUBMIT REVIEW
// ============================================
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (req.user.role !== 'customer' || ticket.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (ticket.status !== 'Completed') {
      return res.status(400).json({ error: 'Only completed tickets can be reviewed' });
    }

    if (ticket.review) {
      return res.status(400).json({ error: 'Already reviewed' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // ✅ Add review
    ticket.review = {
      rating,
      comment: comment || '',
      customerId: req.user.userId,
      workerId: ticket.workerId,
      ticketId: ticket._id,
      createdAt: new Date(),
    };
    await ticket.save();

    // Update worker rating
    const worker = await User.findById(ticket.workerId);
    if (worker) {
      const newAvg = ((worker.rating?.average || 0) * (worker.rating?.count || 0) + rating) / ((worker.rating?.count || 0) + 1);
      worker.rating.average = Math.round(newAvg * 10) / 10;
      worker.rating.count = (worker.rating?.count || 0) + 1;
      await worker.save();
    }

    res.json(ticket);
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Failed to submit review: ' + error.message });
  }
});

// ============================================
// 🟢 DASHBOARD STATISTICS
// ============================================
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    
    let query = {};
    if (role === 'customer') {
      query.customerId = userId;
    } else if (role === 'agent') {
      query.$or = [
        { agentId: userId },
        { agentId: null, status: { $nin: ['Completed', 'Rejected', 'Cancelled'] } }
      ];
    } else if (role === 'worker') {
      query.workerId = userId;
    }
    
    const totalTickets = await Ticket.countDocuments(query);
    const completedTickets = await Ticket.countDocuments({ ...query, status: 'Completed' });
    const openTickets = await Ticket.countDocuments({ 
      ...query, 
      status: { $in: ['New', 'Assigned', 'In Progress'] } 
    });
    const cancelledTickets = await Ticket.countDocuments({ 
      ...query, 
      status: { $in: ['Rejected', 'Cancelled'] } 
    });
    
    const highPriority = await Ticket.countDocuments({ 
      ...query, 
      priority: { $in: ['High', 'Urgent'] },
      status: { $in: ['New', 'Assigned', 'In Progress'] }
    });
    
    const categoryStats = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const statusStats = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    res.json({
      totalTickets,
      completedTickets,
      openTickets,
      cancelledTickets,
      highPriority,
      categoryStats,
      statusStats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics: ' + error.message });
  }
});

module.exports = router;