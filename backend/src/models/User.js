const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleAuth;
    },
    minlength: 6,
    select: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  isGoogleAuth: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['customer', 'agent', 'worker', 'admin'],
    default: 'customer',
  },
  skills: [{
    type: String,
    enum: ['plumbing', 'electrical', 'carpentry', 'cleaning', 'painting', 'general', 'hvac', 'gardening'],
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
    },
    reviews: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  completedTasks: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  lastLogin: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    language: {
      type: String,
      default: 'en',
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ============================================
// ✅ Virtuals
// ============================================
UserSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

UserSchema.virtual('isWorker').get(function() {
  return this.role === 'worker' || this.role === 'agent';
});

UserSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

// ============================================
// ✅ Pre-save middleware - FIXED
// ============================================
UserSchema.pre('save', function() {
  if (this.isNew) {
    this.lastLogin = new Date();
  }
});

// ============================================
// ✅ Methods
// ============================================
UserSchema.methods = {
  toJSON: function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
  },
  updateRating: function(newRating) {
    const total = this.rating.average * this.rating.count;
    this.rating.count += 1;
    this.rating.average = (total + newRating) / this.rating.count;
    return this.save();
  },
  incrementCompletedTasks: function() {
    this.completedTasks += 1;
    return this.save();
  },
};

// ============================================
// ✅ Statics
// ============================================
UserSchema.statics = {
  findByEmail: function(email) {
    return this.findOne({ email }).select('+password');
  },
  findOrCreateGoogleUser: async function(profile) {
    const { id, displayName, emails, photos } = profile;
    const email = emails[0]?.value;
    const avatar = photos[0]?.value || '';

    let user = await this.findOne({ googleId: id });
    if (user) {
      if (avatar && user.avatar !== avatar) {
        user.avatar = avatar;
        await user.save();
      }
      return user;
    }

    user = await this.findOne({ email });
    if (user) {
      user.googleId = id;
      user.avatar = avatar || user.avatar;
      user.isGoogleAuth = true;
      await user.save();
      return user;
    }

    return await this.create({
      googleId: id,
      name: displayName,
      email: email,
      avatar: avatar,
      isGoogleAuth: true,
      role: 'customer',
      emailVerified: true,
      lastLogin: new Date(),
    });
  },
  getWorkerStats: async function() {
    return this.aggregate([
      { $match: { role: { $in: ['worker', 'agent'] } } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating.average' },
          totalTasks: { $sum: '$completedTasks' },
          available: {
            $sum: { $cond: ['$isAvailable', 1, 0] },
          },
        },
      },
    ]);
  },
};

// ============================================
// ✅ Indexes
// ============================================
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isAvailable: 1 });
UserSchema.index({ 'rating.average': -1 });

// ============================================
// ✅ Export
// ============================================
const User = mongoose.model('User', UserSchema);
module.exports = User;