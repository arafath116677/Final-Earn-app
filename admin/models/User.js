// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: String,
//   password: String,
//   balance: {
//     type: Number,
//     default: 20
//   },
//   blocked: {
//     type: Boolean,
//     default: false
//   }
// });

// module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 20 },
  blocked: { type: Boolean, default: false } // ✅ Block field
});

module.exports = mongoose.model('User', userSchema);
