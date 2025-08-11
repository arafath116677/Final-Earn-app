const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const BonusCode = require('../models/BonusCode');
const SupportTicket = require('../models/SupportTicket');
const auth = require('../middleware/auth');
// ✅ Admin Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Success
    res.status(200).json({ message: 'Login successful', email: admin.email });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Server error!' });
  }
});

// ✅ Create Bonus Code
router.post('/bonus-code', async (req, res) => {
  try {
    const { code, reward } = req.body;

    if (!code || !reward) {
      return res.status(400).send("Code and reward required");
    }

    const exists = await BonusCode.findOne({ code });
    if (exists) {
      return res.status(400).send("Code already exists");
    }

    const newBonus = new BonusCode({
      code,
      reward: Number(reward),
      active: true,
      usedBy: []
    });

    await newBonus.save();
    res.send("✅ Bonus code activated successfully");
  } catch (err) {
    console.error("Error creating bonus code:", err);
    res.status(500).send("❌ Server error");
  }
});

// ✅ Deactivate Bonus Code
router.post('/bonus-code/deactivate', async (req, res) => {
  try {
    const { code } = req.body;

    const bonus = await BonusCode.findOne({ code });
    if (!bonus) return res.status(404).send("❌ Code not found");

    bonus.active = false;
    await bonus.save();
    res.send("✅ Bonus code deactivated");
  } catch (err) {
    console.error("Error deactivating code:", err);
    res.status(500).send("❌ Server error");
  }
});

router.get('/support/tickets', async (req, res) => {
  try {
    // এখন কোনো অ্যাডমিন যাচাই করা হচ্ছে না
    
    // ডাটাবেস থেকে সকল টিকিট নিয়ে আসা
    const allTickets = await SupportTicket.find({})
      .populate('userId', 'name email') // userId ফিল্ডের মাধ্যমে User মডেল থেকে নাম এবং ইমেইল নিয়ে আসা
      .sort({ createdAt: -1 }); // নতুন টিকিটগুলো আগে দেখানোর জন্য createdAt অনুযায়ী সাজানো

    res.json({ success: true, tickets: allTickets });

  } catch (err) {
    console.error("Admin ticket fetch error:", err);
    res.status(500).json({ success: false, message: "সার্ভার ত্রুটি। আবার চেষ্টা করুন।" });
  }
});

module.exports = router;