const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const withdrawRoutes = require('./routes/withdraw');
const depositRoutes = require('./routes/deposit');
const BonusCode = require('./models/BonusCode');
const Notification = require('./models/Notification');
const auth = require('./middleware/auth');
mongoose.connect('mongodb+srv://arafathrhaman0:arafathrhaman0@cluster0.ns2ajxr.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', adminRoutes);
app.use('/admin/users', userRoutes);
// Views
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.use('/users', userRoutes);
app.use('/admin', depositRoutes);
app.use('/uploads', express.static('uploads')); // Screenshot access
app.use('/admin/withdraw', withdrawRoutes);

const Deposit = require('./models/Deposit');
const User = require('./models/User');

// Approve Deposit with referral bonus system
app.post('/admin/deposit/approve/:id', async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).send("Not found");

    deposit.status = 'approved';
    await deposit.save();

    const user = await User.findById(deposit.userId);
    if (user) {
      // ব্যালেন্সে ডিপোজিট অ্যাড
      user.balance += parseFloat(deposit.amount);
      await user.save();

      // ✅ Check if this is the user's first approved deposit
      const approvedDeposits = await Deposit.find({ userId: user._id, status: 'approved' });

      if (
        approvedDeposits.length === 1 &&
        user.referredBy &&
        !user.referralBonusGiven
      ) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          referrer.balance += 20;
          await referrer.save();

          // Commission হিস্ট্রি সেভ (Commission মডেল আগে ইমপোর্ট করে নিতে হবে)
          const Commission = require('./models/Commission');
          await Commission.create({
            userId: referrer._id,
            amount: 20,
            source: 'Referral',
            note: `Referred user ${user.name}`
          });

          // ✅ ফ্ল্যাগ সেট করুন যেন আবার না হয়
          user.referralBonusGiven = true;
          await user.save();
        }
      }
    }

    res.send("Approved with referral logic");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Reject Deposit
app.post('/admin/deposit/reject/:id', async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).send("Not found");

    deposit.status = 'rejected';
    await deposit.save();

    res.send("Rejected");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Add this in server.js for admin
app.post('/api/admin/bonus/create', async (req, res) => {
  const { code } = req.body;

  const exists = await BonusCode.findOne({ code });
  if (exists) return res.status(400).send("Code already exists");

  await new BonusCode({ code }).save();
  res.send("Bonus code created");
});

app.post('/api/admin/bonus/toggle', async (req, res) => {
  const { code } = req.body;
  const bonus = await BonusCode.findOne({ code });
  if (!bonus) return res.status(404).send("Code not found");

  bonus.active = !bonus.active;
  await bonus.save();
  res.send(`Code is now ${bonus.active ? 'Active' : 'Inactive'}`);
});

app.post('/api/admin/bonus-code', async (req, res) => {
  const { code, reward } = req.body;

  if (!code || !reward) return res.status(400).send("Code and reward required");

  const exists = await BonusCode.findOne({ code });
  if (exists) return res.status(400).send("Code already exists");

  const newCode = new BonusCode({ code, reward, active: true });
  await newCode.save();

  res.send("✅ Bonus code activated successfully");
});

app.post('/api/admin/bonus-code/deactivate', async (req, res) => {
  const { code } = req.body;

  const bonus = await BonusCode.findOne({ code });
  if (!bonus) return res.status(404).send("Code not found");

  bonus.active = false;
  await bonus.save();

  res.send("❌ Bonus code deactivated successfully");
});

// Bonus Code List Route
app.get('/admin/bonus-code/active', async (req, res) => {
  try {
    const codes = await BonusCode.find({ active: true }).select('code reward');
    res.json(codes);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Could not fetch active bonus codes");
  }
});

app.post('/api/admin/notifications', async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "শিরোনাম এবং বার্তা উভয়ই আবশ্যক।" });
    }

    const newNotification = new Notification({ title, message });
    await newNotification.save();

    res.status(201).json({ success: true, message: 'নোটিফিকেশন সফলভাবে পাঠানো হয়েছে।' });
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি। নোটিফিকেশন পাঠানো যায়নি।' });
  }
});

// নোটিফিকেশন লোড করার জন্য GET রুট
app.get('/api/admin/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি, নোটিফিকেশন লোড করা যায়নি।' });
  }
});

// নোটিফিকেশন ডিলিট করার জন্য DELETE রুট
app.delete('/api/admin/notifications/:id', async (req, res) => {
  try {
    const notificationId = req.params.id;
    const result = await Notification.findByIdAndDelete(notificationId);

    if (!result) {
      return res.status(404).json({ message: 'নোটিফিকেশন খুঁজে পাওয়া যায়নি।' });
    }

    res.status(200).json({ message: 'নোটিফিকেশন সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি, নোটিফিকেশন মুছে ফেলা যায়নি।' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));