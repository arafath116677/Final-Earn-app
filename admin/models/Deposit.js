const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['bkash', 'nagad', 'rocket'], required: true },
  transactionId: { type: String, required: true },
  phone: { type: String, required: true },
  screenshotUrl: { type: String }, // uploads/filename.png
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deposit', depositSchema);