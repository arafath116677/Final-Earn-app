const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Block user
router.put('/block/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { blocked: true });
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: 'Error blocking user' });
  }
});

// Unblock user
router.put('/unblock/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { blocked: false });
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ message: 'Error unblocking user' });
  }
});

// Delete user
router.delete('/delete/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;
