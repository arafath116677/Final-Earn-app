// routes/withdraw.js
const express = require('express');
const router = express.Router();
const Withdraw = require('../models/Withdraw');
const User = require('../models/User');

// Admin panel থেকে সব withdraw request দেখার জন্য
router.get('/requests', async (req, res) => {
  try {
    const requests = await Withdraw.find().populate('userId', 'email').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching withdraw requests' });
  }
});

// Approve request
router.post('/approve/:id', async (req, res) => {
  try {
    const withdraw = await Withdraw.findById(req.params.id);
    if (!withdraw) return res.status(404).send('Not found');

    withdraw.status = 'approved';
    await withdraw.save();

    res.send('Withdraw approved');
  } catch (err) {
    console.error(err);
    res.status(500).send('Approval failed');
  }
});

// Reject request
router.post('/reject/:id', async (req, res) => {
  try {
    const withdraw = await Withdraw.findById(req.params.id);
    if (!withdraw) return res.status(404).send('Not found');

    withdraw.status = 'rejected';
    await withdraw.save();

    res.send('Withdraw rejected');
  } catch (err) {
    res.status(500).send('Rejection failed');
  }
});

module.exports = router;