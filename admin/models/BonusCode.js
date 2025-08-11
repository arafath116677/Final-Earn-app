const mongoose = require('mongoose');

const bonusCodeSchema = new mongoose.Schema({
  code: String,
  reward: Number,
  active: {
    type: Boolean,
    default: true
  },
  usedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

module.exports = mongoose.model('BonusCode', bonusCodeSchema);