const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

// MongoDB URI
const mongoURI = 'mongodb+srv://arafathrhaman0:arafathrhaman0@cluster0.ns2ajxr.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  const email = 'ad@gmail.com';
  const plainPassword = 'admin';

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    console.log('⚠️ Admin already exists');
    return mongoose.disconnect();
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const admin = new Admin({ email, password: hashedPassword });
  await admin.save();

  console.log('✅ Admin created successfully!');
  mongoose.disconnect();
})
.catch((err) => {
  console.error('❌ MongoDB Connection Error:', err);
});