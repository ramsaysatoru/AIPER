const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect } = require('../middlewares/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        branch: user.branch,
        requiresPasswordChange: user.requiresPasswordChange,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change password (used for initial login or forgotten)
router.put('/change-password', protect, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      user.password = newPassword;
      user.requiresPasswordChange = false;
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/auth/otp-recovery
// @desc    Mock OTP login for forgotten password scenario
router.post('/otp-recovery', async (req, res) => {
  // In a real scenario, this would verify an OTP and let the user reset their password.
  // For now, we return a mock success message.
  res.json({ message: 'OTP verified. Proceed to reset password.' });
});

module.exports = router;
