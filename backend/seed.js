const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas for seeding');
    
    const adminExists = await User.findOne({ email: 'admin@foodlab.com' });
    if (!adminExists) {
      const admin = new User({
        name: 'System Admin',
        email: 'admin@foodlab.com',
        phone: '1234567890',
        role: 'ADMIN',
        password: 'AdminPassword123!',
        requiresPasswordChange: false
      });
      await admin.save();
      console.log('Admin user created: admin@foodlab.com / AdminPassword123!');
    } else {
      console.log('Admin already exists');
    }

    const labHeadExists = await User.findOne({ email: 'labhead@foodlab.com' });
    if (!labHeadExists) {
      const labHead = new User({
        name: 'Lab Head',
        email: 'labhead@foodlab.com',
        phone: '1234567890',
        role: 'LAB_HEAD',
        password: 'LabHeadPassword123!',
        requiresPasswordChange: false
      });
      await labHead.save();
      console.log('Lab Head user created: labhead@foodlab.com / LabHeadPassword123!');
    } else {
      console.log('Lab Head already exists');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
