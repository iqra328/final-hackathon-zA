const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, preferences, isAvailable } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (preferences !== undefined) updates.preferences = preferences;
    if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Email is already in use' });
    res.status(400).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
