const express = require('express');
const router = express.Router();
const Deposit = require('../models/Deposit');
const User = require('../models/User');

// Get all deposits
router.get('/deposit-requests', async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate('userId', 'email')
      .sort({ createdAt: -1 });

    res.json(deposits);
  } catch (err) {
    res.status(500).json({ message: "Error fetching deposits" });
  }
});

// Approve deposit
router.post('/deposit/approve/:id', async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).send("Not found");

    deposit.status = 'approved';
    await deposit.save();

    const user = await User.findById(deposit.userId);
    if (user) {
      user.balance += deposit.amount;
      await user.save();
    }

    res.send("Approved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Approval failed");
  }
});

// Reject deposit
router.post('/deposit/reject/:id', async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).send("Not found");

    deposit.status = 'rejected';
    await deposit.save();

    res.send("Rejected");
  } catch (err) {
    console.error(err);
    res.status(500).send("Rejection failed");
  }
});

module.exports = router;