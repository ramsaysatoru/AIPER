const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Get all users (Admin sees all, Lab Head sees all except Admin maybe? Let's just let Admin/Lab Head see all. Head sees their assistants)
router.get('/', protect, authorize('ADMIN', 'LAB_HEAD', 'HEAD'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'HEAD') {
      // Head can only see assistants they created
      query = { role: 'ASSISTANT', createdBy: req.user._id };
    }
    const users = await User.find(query).select('-password').populate('createdBy', 'name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new user
router.post('/', protect, authorize('ADMIN', 'LAB_HEAD', 'HEAD'), async (req, res) => {
  try {
    const { name, email, phone, role, department, branch } = req.body;

    // Validation logic for role hierarchy
    if (req.user.role === 'ADMIN' && role !== 'LAB_HEAD') {
      return res.status(403).json({ message: 'Admin can only create LAB_HEAD users' });
    }
    if (req.user.role === 'LAB_HEAD' && !['HEAD', 'ASSISTANT'].includes(role)) {
      return res.status(403).json({ message: 'Lab Head can only create HEAD or ASSISTANT users' });
    }
    if (req.user.role === 'HEAD' && role !== 'ASSISTANT') {
      return res.status(403).json({ message: 'Head can only create ASSISTANT users' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Assign password from request or fall back
    const defaultPassword = req.body.password || 'DefaultPassword123!';

    const user = await User.create({
      name,
      email,
      phone,
      role,
      department: req.user.role === 'HEAD' ? req.user.department : department, 
      branch: req.user.role === 'HEAD' ? req.user.branch : branch,
      password: defaultPassword,
      requiresPasswordChange: true,
      createdBy: req.user._id
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      temporaryPassword: defaultPassword 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a user
router.put('/:id', protect, authorize('LAB_HEAD', 'HEAD'), async (req, res) => {
  try {
    const userToEdit = await User.findById(req.params.id);
    if (!userToEdit) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure they have permission
    if (req.user.role === 'HEAD' && String(userToEdit.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this user' });
    }
    if (req.user.role === 'LAB_HEAD' && userToEdit.role === 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to edit Admin users' });
    }

    const { name, email, phone, department, branch } = req.body;
    userToEdit.name = name || userToEdit.name;
    userToEdit.email = email || userToEdit.email;
    userToEdit.phone = phone || userToEdit.phone;
    if (req.user.role === 'LAB_HEAD') {
      userToEdit.department = department || userToEdit.department;
      userToEdit.branch = branch || userToEdit.branch;
    }

    await userToEdit.save();
    res.json(userToEdit);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user
router.delete('/:id', protect, authorize('LAB_HEAD', 'HEAD'), async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure they have permission
    if (req.user.role === 'HEAD' && String(userToDelete.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this user' });
    }
    if (req.user.role === 'LAB_HEAD' && userToDelete.role === 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete Admin users' });
    }

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
