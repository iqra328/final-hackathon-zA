// const mongoose = require('mongoose');

// // ============================================
// // MESSAGE SCHEMA
// // ============================================
// const MessageSchema = new mongoose.Schema({
//   sender: {
//     type: String,
//     enum: ['customer', 'agent', 'worker'],
//     required: true,
//   },
//   senderId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   message: {
//     type: String,
//     required: [true, 'Message content is required'],
//     trim: true,
//   },
//   timestamp: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // ============================================
// // REVIEW SCHEMA
// // ============================================
// const ReviewSchema = new mongoose.Schema({
//   rating: {
//     type: Number,
//     min: 1,
//     max: 5,
//     required: [true, 'Rating is required (1-5)'],
//   },
//   comment: {
//     type: String,
//     trim: true,
//     maxlength: 500,
//     default: '',
//   },
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   workerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   ticketId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Ticket',
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // ============================================
// // AI SUGGESTION SCHEMA
// // ============================================
// const AISuggestionSchema = new mongoose.Schema({
//   category: {
//     type: String,
//     enum: ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Painting', 'General'],
//     default: 'General',
//   },
//   priority: {
//     type: String,
//     enum: ['Low', 'Medium', 'High', 'Urgent'],
//     default: 'Medium',
//   },
//   summary: {
//     type: String,
//     trim: true,
//     maxlength: 200,
//     default: '',
//   },
//   suggestedWorkers: [{
//     workerId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//     },
//     score: {
//       type: Number,
//       min: 0,
//       max: 100,
//     },
//     reason: {
//       type: String,
//       trim: true,
//     },
//   }],
//   reviewed: {
//     type: Boolean,
//     default: false,
//   },
//   reviewedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//   },
//   reviewedAt: {
//     type: Date,
//     default: null,
//   },
// });

// // ============================================
// // MAIN TICKET SCHEMA
// // ============================================
// const TicketSchema = new mongoose.Schema({
//   ticketNumber: {
//     type: String,
//     unique: true,
//     required: [true, 'Ticket number is required'],
//     trim: true,
//   },
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: [true, 'Customer ID is required'],
//     index: true,
//   },
//   agentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     default: null,
//     index: true,
//   },
//   workerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     default: null,
//     index: true,
//   },
//   subject: {
//     type: String,
//     required: [true, 'Subject is required'],
//     trim: true,
//     maxlength: 200,
//   },
//   description: {
//     type: String,
//     required: [true, 'Description is required'],
//     trim: true,
//   },
//   category: {
//     type: String,
//     enum: ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Painting', 'General'],
//     default: 'General',
//     index: true,
//   },
//   priority: {
//     type: String,
//     enum: ['Low', 'Medium', 'High', 'Urgent'],
//     default: 'Medium',
//     index: true,
//   },
//   urgencyLevel: {
//     type: String,
//     enum: ['Low', 'Medium', 'High'],
//     default: 'Medium',
//   },
//   status: {
//     type: String,
//     enum: ['New', 'Assigned', 'In Progress', 'Completed', 'Rejected', 'Cancelled'],
//     default: 'New',
//     index: true,
//   },
//   aiSuggestion: {
//     type: AISuggestionSchema,
//     default: () => ({}),
//   },
//   messages: {
//     type: [MessageSchema],
//     default: [],
//   },
//   review: {
//     type: ReviewSchema,
//     default: null,
//   },
//   resolutionNote: {
//     type: String,
//     trim: true,
//     default: '',
//   },
//   resolvedAt: {
//     type: Date,
//     default: null,
//   },
//   completedAt: {
//     type: Date,
//     default: null,
//   },
//   cancelledAt: {
//     type: Date,
//     default: null,
//   },
//   assignedAt: {
//     type: Date,
//     default: null,
//   },
// }, {
//   timestamps: true,
// });

// // ============================================
// // INDEXES
// // ============================================
// TicketSchema.index({ ticketNumber: 1 }, { unique: true });
// TicketSchema.index({ customerId: 1, status: 1 });
// TicketSchema.index({ agentId: 1, status: 1 });
// TicketSchema.index({ workerId: 1, status: 1 });
// TicketSchema.index({ status: 1, priority: 1 });
// TicketSchema.index({ category: 1, status: 1 });
// TicketSchema.index({ createdAt: -1 });

// // ============================================
// // VIRTUALS
// // ============================================
// TicketSchema.virtual('isResolved').get(function() {
//   return this.status === 'Completed' || this.status === 'Rejected' || this.status === 'Cancelled';
// });

// TicketSchema.virtual('isActive').get(function() {
//   return !this.isResolved;
// });

// TicketSchema.virtual('totalMessages').get(function() {
//   return this.messages ? this.messages.length : 0;
// });

// TicketSchema.virtual('hasReview').get(function() {
//   return this.review !== null && this.review !== undefined;
// });

// // ============================================
// // METHODS
// // ============================================

// TicketSchema.methods.addMessage = async function(sender, senderId, message) {
//   this.messages.push({
//     sender,
//     senderId,
//     message,
//     timestamp: new Date(),
//   });
//   return await this.save();
// };

// TicketSchema.methods.assignAgent = async function(agentId) {
//   this.agentId = agentId;
//   this.status = 'Assigned';
//   this.assignedAt = new Date();
//   return await this.save();
// };

// TicketSchema.methods.assignWorker = async function(workerId) {
//   this.workerId = workerId;
//   this.status = 'Assigned';
//   this.assignedAt = new Date();
//   return await this.save();
// };

// TicketSchema.methods.complete = async function(resolutionNote) {
//   if (this.status === 'Completed' || this.status === 'Rejected') {
//     throw new Error('Ticket is already completed or rejected');
//   }
//   this.status = 'Completed';
//   this.completedAt = new Date();
//   this.resolvedAt = new Date();
//   if (resolutionNote) {
//     this.resolutionNote = resolutionNote;
//   }
//   return await this.save();
// };

// TicketSchema.methods.reject = async function(reason) {
//   if (this.status === 'Completed' || this.status === 'Rejected') {
//     throw new Error('Ticket is already completed or rejected');
//   }
//   this.status = 'Rejected';
//   this.cancelledAt = new Date();
//   this.resolvedAt = new Date();
//   if (reason) {
//     this.resolutionNote = reason;
//   }
//   return await this.save();
// };

// TicketSchema.methods.cancel = async function() {
//   if (this.status === 'Completed' || this.status === 'Rejected') {
//     throw new Error('Cannot cancel completed or rejected ticket');
//   }
//   this.status = 'Cancelled';
//   this.cancelledAt = new Date();
//   return await this.save();
// };

// TicketSchema.methods.addReview = async function(rating, comment, customerId, workerId) {
//   if (this.status !== 'Completed') {
//     throw new Error('Only completed tickets can be reviewed');
//   }
//   if (this.review) {
//     throw new Error('Ticket already has a review');
//   }
//   this.review = {
//     rating,
//     comment: comment || '',
//     customerId,
//     workerId: workerId || this.workerId,
//     ticketId: this._id,
//     createdAt: new Date(),
//   };
//   return await this.save();
// };

// TicketSchema.methods.updateAIReview = async function(category, priority, summary, reviewedBy) {
//   if (!this.aiSuggestion) {
//     this.aiSuggestion = {};
//   }
//   this.aiSuggestion.category = category;
//   this.aiSuggestion.priority = priority;
//   this.aiSuggestion.summary = summary;
//   this.aiSuggestion.reviewed = true;
//   this.aiSuggestion.reviewedBy = reviewedBy;
//   this.aiSuggestion.reviewedAt = new Date();
  
//   this.category = category;
//   this.priority = priority;
  
//   return await this.save();
// };

// // ============================================
// // STATIC METHODS
// // ============================================

// TicketSchema.statics.getCustomerTickets = function(customerId) {
//   return this.find({ customerId })
//     .sort({ createdAt: -1 })
//     .populate('agentId', 'name email')
//     .populate('workerId', 'name email rating');
// };

// TicketSchema.statics.getAgentTickets = function(agentId) {
//   return this.find({
//     $or: [
//       { agentId },
//       { agentId: null, status: { $in: ['New', 'Assigned'] } }
//     ]
//   })
//     .sort({ priority: -1, createdAt: 1 })
//     .populate('customerId', 'name email')
//     .populate('workerId', 'name email rating');
// };

// TicketSchema.statics.getWorkerTickets = function(workerId) {
//   return this.find({ workerId })
//     .sort({ createdAt: -1 })
//     .populate('customerId', 'name email')
//     .populate('agentId', 'name email');
// };

// // ============================================
// // ✅ FIXED: PRE-SAVE MIDDLEWARE - NO 'next'
// // ============================================
// TicketSchema.pre('save', async function() {
//   // Auto-update timestamps based on status
//   if (this.isModified('status')) {
//     if (this.status === 'Completed') {
//       this.completedAt = new Date();
//       this.resolvedAt = new Date();
//     } else if (this.status === 'Rejected' || this.status === 'Cancelled') {
//       this.cancelledAt = new Date();
//       this.resolvedAt = new Date();
//     } else if (this.status === 'Assigned' && !this.assignedAt) {
//       this.assignedAt = new Date();
//     }
//   }
// });

// // ============================================
// // TOJSON TRANSFORM
// // ============================================
// TicketSchema.set('toJSON', {
//   virtuals: true,
//   transform: function(doc, ret) {
//     delete ret.__v;
//     return ret;
//   }
// });

// TicketSchema.set('toObject', {
//   virtuals: true,
// });

// // ============================================
// // EXPORT
// // ============================================
// module.exports = mongoose.model('Ticket', TicketSchema);



const mongoose = require('mongoose');

// ============================================
// MESSAGE SCHEMA
// ============================================
const MessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['customer', 'agent', 'worker'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// ============================================
// REVIEW SCHEMA
// ============================================
const ReviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Rating is required (1-5)'],
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================
// AI SUGGESTION SCHEMA
// ============================================
const AISuggestionSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Painting', 'General'],
    default: 'General',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  suggestedWorkers: [{
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    reason: {
      type: String,
      trim: true,
    },
  }],
  reviewed: {
    type: Boolean,
    default: false,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
});

// ============================================
// MAIN TICKET SCHEMA
// ============================================
const TicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: [true, 'Ticket number is required'],
    trim: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required'],
    index: true,
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Painting', 'General'],
    default: 'General',
    index: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
    index: true,
  },
  urgencyLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['New', 'Assigned', 'In Progress', 'Completed', 'Rejected', 'Cancelled'],
    default: 'New',
    index: true,
  },
  aiSuggestion: {
    type: AISuggestionSchema,
    default: () => ({}),
  },
  messages: {
    type: [MessageSchema],
    default: [],
  },
  review: {
    type: ReviewSchema,
    default: null,
  },
  resolutionNote: {
    type: String,
    trim: true,
    default: '',
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  assignedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// ============================================
// ✅ INDEXES - FIXED (No Duplicate)
// ============================================

// ✅ Only one index for ticketNumber
TicketSchema.index({ ticketNumber: 1 }, { unique: true });

// Other indexes
TicketSchema.index({ customerId: 1, status: 1 });
TicketSchema.index({ agentId: 1, status: 1 });
TicketSchema.index({ workerId: 1, status: 1 });
TicketSchema.index({ status: 1, priority: 1 });
TicketSchema.index({ category: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================
TicketSchema.virtual('isResolved').get(function() {
  return this.status === 'Completed' || this.status === 'Rejected' || this.status === 'Cancelled';
});

TicketSchema.virtual('isActive').get(function() {
  return !this.isResolved;
});

TicketSchema.virtual('totalMessages').get(function() {
  return this.messages ? this.messages.length : 0;
});

TicketSchema.virtual('hasReview').get(function() {
  return this.review !== null && this.review !== undefined;
});

// ============================================
// METHODS
// ============================================

TicketSchema.methods.addMessage = async function(sender, senderId, message) {
  this.messages.push({
    sender,
    senderId,
    message,
    timestamp: new Date(),
  });
  return await this.save();
};

TicketSchema.methods.assignAgent = async function(agentId) {
  this.agentId = agentId;
  this.status = 'Assigned';
  this.assignedAt = new Date();
  return await this.save();
};

TicketSchema.methods.assignWorker = async function(workerId) {
  this.workerId = workerId;
  this.status = 'Assigned';
  this.assignedAt = new Date();
  return await this.save();
};

TicketSchema.methods.complete = async function(resolutionNote) {
  if (this.status === 'Completed' || this.status === 'Rejected') {
    throw new Error('Ticket is already completed or rejected');
  }
  this.status = 'Completed';
  this.completedAt = new Date();
  this.resolvedAt = new Date();
  if (resolutionNote) {
    this.resolutionNote = resolutionNote;
  }
  return await this.save();
};

TicketSchema.methods.reject = async function(reason) {
  if (this.status === 'Completed' || this.status === 'Rejected') {
    throw new Error('Ticket is already completed or rejected');
  }
  this.status = 'Rejected';
  this.cancelledAt = new Date();
  this.resolvedAt = new Date();
  if (reason) {
    this.resolutionNote = reason;
  }
  return await this.save();
};

TicketSchema.methods.cancel = async function() {
  if (this.status === 'Completed' || this.status === 'Rejected') {
    throw new Error('Cannot cancel completed or rejected ticket');
  }
  this.status = 'Cancelled';
  this.cancelledAt = new Date();
  return await this.save();
};

TicketSchema.methods.addReview = async function(rating, comment, customerId, workerId) {
  if (this.status !== 'Completed') {
    throw new Error('Only completed tickets can be reviewed');
  }
  if (this.review) {
    throw new Error('Ticket already has a review');
  }
  this.review = {
    rating,
    comment: comment || '',
    customerId,
    workerId: workerId || this.workerId,
    ticketId: this._id,
    createdAt: new Date(),
  };
  return await this.save();
};

TicketSchema.methods.updateAIReview = async function(category, priority, summary, reviewedBy) {
  if (!this.aiSuggestion) {
    this.aiSuggestion = {};
  }
  this.aiSuggestion.category = category;
  this.aiSuggestion.priority = priority;
  this.aiSuggestion.summary = summary;
  this.aiSuggestion.reviewed = true;
  this.aiSuggestion.reviewedBy = reviewedBy;
  this.aiSuggestion.reviewedAt = new Date();
  
  this.category = category;
  this.priority = priority;
  
  return await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

TicketSchema.statics.getCustomerTickets = function(customerId) {
  return this.find({ customerId })
    .sort({ createdAt: -1 })
    .populate('agentId', 'name email')
    .populate('workerId', 'name email rating');
};

TicketSchema.statics.getAgentTickets = function(agentId) {
  return this.find({
    $or: [
      { agentId },
      { agentId: null, status: { $in: ['New', 'Assigned'] } }
    ]
  })
    .sort({ priority: -1, createdAt: 1 })
    .populate('customerId', 'name email')
    .populate('workerId', 'name email rating');
};

TicketSchema.statics.getWorkerTickets = function(workerId) {
  return this.find({ workerId })
    .sort({ createdAt: -1 })
    .populate('customerId', 'name email')
    .populate('agentId', 'name email');
};

// ============================================
// MIDDLEWARE
// ============================================
TicketSchema.pre('save', async function() {
  if (this.isModified('status')) {
    if (this.status === 'Completed') {
      this.completedAt = new Date();
      this.resolvedAt = new Date();
    } else if (this.status === 'Rejected' || this.status === 'Cancelled') {
      this.cancelledAt = new Date();
      this.resolvedAt = new Date();
    } else if (this.status === 'Assigned' && !this.assignedAt) {
      this.assignedAt = new Date();
    }
  }
});

// ============================================
// TOJSON TRANSFORM
// ============================================
TicketSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

TicketSchema.set('toObject', {
  virtuals: true,
});

// ============================================
// EXPORT
// ============================================
module.exports = mongoose.model('Ticket', TicketSchema);