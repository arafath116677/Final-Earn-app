const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const BonusCode = require('./models/BonusCode');
const cloudinary = require('cloudinary').v2;
const fileUpload = require('express-fileupload');
const upload = multer({ dest: 'uploads/' });
const authMiddleware = require('./middleware/authMiddleware');
const Notification = require('./models/Notification');
const userRoutes = require('./routes/userRoutes');
const Commission = require('./models/Commission');
const wheelRoutes = require('./routes/wheel');
const cron = require("node-cron");
const auth = require('./middleware/auth');
const Package = require('./models/Package');
const Task = require('./models/Task');
const User = require('./models/User');
const Deposit = require('./models/Deposit');
const Withdraw = require('./models/Withdraw');
const SupportTicket = require('./models/SupportTicket');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 8080;
const JWT_SECRET = "mySuperSecretKey123";

mongoose.connect("mongodb+srv://arafathrhaman0:arafathrhaman0@cluster0.ns2ajxr.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));


cron.schedule("0 0 * * *", async () => {
  const today = new Date().toISOString().split("T")[0];
  await User.updateMany({}, { $unset: { [`adsWatched.${today}`]: "" } });
  console.log("🕛 Ads reset for all users at midnight.");
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './public/uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    cb(null, Date.now() + '.' + ext);
  }
});

const emailTemplate = (otp) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; padding-bottom: 20px;">
            <img src="https://i.ibb.co/rRG8qgFm/Lucid-Realism-Creative-logo-design-for-Clickora-ads-watch-and-0-removebg-preview.png" alt="Your Company Logo" style="width: 150px;"/>
        </div>
        <h2 style="color: #333; text-align: center;">Registration OTP</h2>
        <p style="font-size: 16px; color: #555;">Hi there,</p>
        <p style="font-size: 16px; color: #555;">Thank you for registering with us. Please use the following One-Time Password (OTP) to complete your registration. This OTP is valid for 5 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; padding: 10px 20px; background-color: #f0f8ff; border-radius: 5px;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #888; text-align: center;">If you did not request this, please ignore this email.</p>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; margin-top: 20px;">
            <p style="font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
        </div>
    </div>
`;

const transporter = nodemailer.createTransport({
    service: 'gmail', // or any other email service
    auth: {
        user: 'arafathrhaman0@gmail.com', // ⚠️ আপনার ইমেল লিখুন
        pass: 'rgycjvjvwmofauox' // ⚠️ আপনার অ্যাপ পাসওয়ার্ড লিখুন
    }
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('views'));
app.use('/api/wheel', require('./routes/wheel'));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', userRoutes);
app.use('/api/wheel', wheelRoutes);

const sendView = (view) => (req, res) => res.sendFile(path.join(__dirname, 'views', view));
app.get('/', sendView('index.html'));
app.get('/login', sendView('index.html'));
app.get('/register', sendView('register.html'));
app.get('/dashboard', sendView('dashboard.html'));
app.get('/deposit', sendView('deposit.html'));
app.get('/withdraw', sendView('withdraw.html'));
app.get('/withdraw-history', sendView('withdraw-history.html'));
app.get('/deposit-history', sendView('deposit-history.html'));
app.get('/bonus', sendView('bonus.html'));
app.get('/team', sendView('team.html'));
app.get('/profile', sendView('profile.html'));
app.get('/package', sendView('package.html'));
app.get('/task', sendView('tasks.html'));
app.get('/commission', sendView('commission.html'));
app.get('/leaderboard', sendView('leaderboard.html'));
app.get('/notifications', sendView('notifications.html'));
app.get('/count', sendView('count.html'));
app.get('/reve', sendView('reve.html'));
app.get('/app', sendView('app.html'));
app.get('/r/:referCode', sendView('index.html'));
// Registration with OTP verification
app.post('/register', async (req, res) => {
  const { name, email, password, otp } = req.body;
  if (!name || !email || !password || !otp) return res.status(400).send('Missing name, email, password, or OTP');

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send('User not found. Please send OTP first.');
  if (user.blocked) return res.status(403).send("Your account has been blocked");

  // Check OTP
  if (user.otp !== Number(otp) || user.otpExpiration < Date.now()) {
    return res.status(400).send('Invalid or expired OTP');
  }

  // OTP is valid, now complete registration
  const hashedPassword = await bcrypt.hash(password, 10);
  user.name = name;
  user.password = hashedPassword;
  user.balance = 20;
  user.otp = undefined; // OTP field will be removed
  user.otpExpiration = undefined; // OTP expiration field will be removed
  await user.save();

  res.status(201).send('User registered');
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Missing credentials');

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send('Invalid email');

  // লগইনের সময় নিশ্চিত করা হচ্ছে যে ব্যবহারকারীর রেজিস্ট্রেশন সম্পূর্ণ হয়েছে
  if (!user.name) {
    return res.status(400).send('User not fully registered. Please complete registration with OTP.');
  }
  
  if (user.blocked) return res.status(403).send("Your account has been blocked");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send('Wrong password');

  const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("Invalid email");
  if (user.blocked) return res.status(403).send("Blocked account");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send("Wrong password");

  const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

app.post('/deposit', authMiddleware, upload.single('screenshot'), async (req, res) => {
  try {
    const { amount, phone, transactionId, method } = req.body;
    const screenshotUrl = req.file ? req.file.path : null;

    const userId = req.user.userId;
    const amountNum = Number(amount);

    const previousDeposits = await Deposit.find({ userId });
    const isFirstDeposit = previousDeposits.length === 0;

    const deposit = new Deposit({
      userId,
      amount: amountNum,
      phone,
      transactionId,
      method,
      screenshotUrl
    });
    await deposit.save();
    
    if (isFirstDeposit && amountNum >= 300) {
      const user = await User.findById(userId);
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          referrer.balance += 20;
          await referrer.save();

          await Commission.create({
            userId: new mongoose.Types.ObjectId(referrer._id),
            amount: 20,
            source: 'Referral',
            note: `Referral reward for ${user.name}'s first deposit`
          });
        }
      }
    }

    res.send("✅ Deposit request submitted");
  } catch (err) {
    console.error("Deposit error:", err);
    res.status(500).send("❌ Deposit failed");
  }
});

app.get('/api/deposit-history', authMiddleware, async (req, res) => {
  try {
    const history = await Deposit.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching deposit history");
  }
});

app.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, method, number } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).send("User not found");

    if (user.balance < amount) return res.status(400).send("Insufficient balance");

    const withdraw = new Withdraw({
      userId: req.user.userId,
      amount,
      method,
      number
    });

    await withdraw.save();
    user.balance -= amount;
    await user.save();

    res.send("Withdraw request submitted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get('/api/withdraw-history', authMiddleware, async (req, res) => {
  try {
    const history = await Withdraw.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching withdraw history");
  }
});

app.post('/api/buy-package', authMiddleware, async (req, res) => {
  try {
    const { packageId } = req.body;
    const user = await User.findById(req.user.userId);
    const pkg = await Package.findById(packageId);

    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    if (user.balance < pkg.price) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.balance -= pkg.price;
    user.packages.push({
      id: pkg._id,
      name: pkg.name,
      adsPerDay: pkg.adsPerDay,
      boughtAt: new Date()
    });

    await user.save();
    return res.status(200).json({ message: '✅ Package purchased successfully!' });

  } catch (err) {
    console.error('Buy Package Error:', err);
    res.status(500).json({ message: '❌ Server error while buying package' });
  }
});

app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find();
    res.json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching packages");
  }
});

app.get('/api/user-info', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).send('User not found');

  const totalAdsPerDay = user.packages.reduce((sum, p) => sum + p.adsPerDay, 0);
  res.json({
    name: user.name,
    balance: user.balance,
    referCode: user._id.toString(),
    totalAdsPerDay
  });
});

app.post('/api/bonus/redeem', authMiddleware, async (req, res) => {
  const { code } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).send("User not found");

    if (!user.packages || user.packages.length === 0) {
      return res.status(403).send("❌ You must purchase a package to redeem bonus codes.");
    }

    const bonus = await BonusCode.findOne({ code });

    if (!bonus || !bonus.active) {
      return res.status(400).send("❌ Invalid or expired code");
    }

    if (bonus.usedBy.includes(user._id)) {
      return res.status(400).send("❌ You already used this code");
    }

    const reward = bonus.reward || Math.floor(Math.random() * 11) + 5;

    user.balance += reward;
    await user.save();

    bonus.usedBy.push(user._id);
    await bonus.save();
    await Commission.create({
      userId: new mongoose.Types.ObjectId(user._id),
      amount: reward,
      source: 'Bonus Code',
      note: `Redeemed code: ${code}`
    });

    res.send(`🎉 Bonus received! ৳${reward} added to your balance.`);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error");
  }
});

cloudinary.config({
  cloud_name: 'dixe6pt1v',
  api_key: '578277981166939',
  api_secret: 'eQqF10-z0X_oOKF_8kLxQHO5bis'
});

app.post('/api/update-profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).send("User not found");

    const { name } = req.body;
    if (name) user.name = name;

    await user.save();
    res.send("Name updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update name");
  }
});

//  লিডারবোর্ড API রুট
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const users = await User.find({});
        const deposits = await Deposit.find({});

        const usersWithStats = users.map(user => {
            const totalDeposits = deposits
                .filter(deposit => deposit.userId.toString() === user._id.toString())
                .reduce((sum, deposit) => sum + deposit.amount, 0);

            return {
                _id: user._id,
                name: user.name,
                totalEarnings: user.balance,
                totalDeposits: totalDeposits
            };
        });
        usersWithStats.sort((a, b) => b.totalEarnings - a.totalEarnings);

        // Find the current user's rank and data
        let currentUser = null;
        let currentUserRank = -1;
        
        const currentUserData = usersWithStats.find(user => user._id.toString() === currentUserId);
        
        if (currentUserData) {
            currentUserRank = usersWithStats.findIndex(user => user._id.toString() === currentUserId) + 1;
            currentUser = {
                _id: currentUserData._id,
                name: currentUserData.name,
                totalEarnings: currentUserData.totalEarnings,
                totalDeposits: currentUserData.totalDeposits,
                rank: currentUserRank
            };
        }

        // Get the top 20 users for the leaderboard
        const leaderboard = usersWithStats.slice(0, 20);

        res.json({ leaderboard, currentUser });

    } catch (error) {
        console.error('Leaderboard API error:', error);
        res.status(500).json({ message: 'Server error while fetching leaderboard.' });
    }
});

app.get('/api/my-referrals', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) return res.status(401).send("Invalid user");

    const referredUsers = await User.find({
      referredBy: currentUser._id.toString()
    });

    const approvedUsers = [];

    for (const user of referredUsers) {
      const hasApprovedDeposit = await Deposit.exists({
        userId: user._id,
        status: 'approved'
      });

      if (hasApprovedDeposit) {
        approvedUsers.push({
          name: user.name,
          balance: user.balance
        });
      }
    }

    res.json(approvedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/api/tasks/status", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.packages || user.packages.length === 0) {
      return res.json({ success: true, hasPackage: false });
    }

    const totalAdsPerDay = user.packages.reduce((sum, p) => sum + p.adsPerDay, 0);
    const today = new Date().toISOString().split("T")[0];
    const adsWatched = user.adsWatched?.get(today) || 0;

    res.json({
      success: true,
      hasPackage: true,
      adsWatched,
      adsLimit: totalAdsPerDay
    });
  } catch (err) {
    console.error("Task status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/tasks/complete", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user || !user.packages || user.packages.length === 0) {
      return res.status(400).json({ success: false, message: "No active package found." });
    }
    
    const totalAdsPerDay = user.packages.reduce((sum, p) => sum + p.adsPerDay, 0);
    const today = new Date().toISOString().split("T")[0];
    const watched = user.adsWatched?.get(today) || 0;

    if (watched >= totalAdsPerDay) {
      return res.status(400).json({ success: false, message: "Daily ad limit reached." });
    }

    const newWatched = watched + 1;
    user.adsWatched.set(today, newWatched);
    user.markModified('adsWatched');
    user.balance += 2;
    
    // ✅ এখানে userId কে ObjectId তে কনভার্ট করে Commission ডেটাবেসে যোগ করা হচ্ছে
    await Commission.create({
      userId: new mongoose.Types.ObjectId(userId),
      amount: 2,
      source: 'Ad Watch',
      note: `Ad watch #${newWatched}`
    });

    await user.save();

    res.json({ success: true, message: "Ad watched successfully!", newBalance: user.balance });
  } catch (err) {
    console.error("Watch ad error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/support/tickets", authMiddleware, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.userId;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "বিষয় এবং বার্তা উভয়ই প্রয়োজন।" });
    }

    // একটি নতুন সাপোর্ট টিকিট তৈরি করে ডাটাবেসে সেভ করা
    const newTicket = new SupportTicket({
      userId,
      subject,
      message,
      status: 'open'
    });

    await newTicket.save();

    res.json({ success: true, message: "আপনার টিকিট সফলভাবে জমা দেওয়া হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।" });

  } catch (err) {
    console.error("Support ticket submission error:", err);
    res.status(500).json({ success: false, message: "সার্ভার ত্রুটি। আবার চেষ্টা করুন।" });
  }
});

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    // সকল নোটিফিকেশন ডেটাবেস থেকে নিয়ে আসা
    const notifications = await Notification.find({}).sort({ createdAt: -1 });

    res.json({ success: true, notifications: notifications });
  } catch (err) {
    console.error("Notification fetch error:", err);
    res.status(500).json({ success: false, message: "সার্ভার ত্রুটি।" });
  }
});

app.post('/send-otp', async (req, res) => {
    const { email, referCode } = req.body;
    if (!email) return res.status(400).send('Email is required');

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.name) {
        return res.status(400).send('Email already in use.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiration = Date.now() + 5 * 60 * 1000;

    let user;
    if (existingUser) {
        user = existingUser;
    } else {
        user = new User({ email });
    }

    if (referCode) {
        const referrer = await User.findById(referCode);
        if (referrer) {
            user.referredBy = referrer._id;
        }
    }
    
    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    const mailOptions = {
        from: 'arafathrhaman0@gmail.com',
        to: email,
        subject: 'Your OTP for Registration',
        html: emailTemplate(otp)
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).send('OTP sent to your email.');
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).send('Failed to send OTP.');
    }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});