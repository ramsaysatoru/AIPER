const express = require('express');
const router = express.Router();
const BugReport = require('../models/BugReport');
const { protect } = require('../middlewares/authMiddleware');

// Submit a bug report (any authenticated user)
router.post('/', protect, async (req, res) => {
  try {
    const { type, severity, description, pageOrFeature } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: 'Type and description are required.' });
    }

    const report = new BugReport({
      type,
      severity: severity || 'MEDIUM',
      description,
      pageOrFeature: pageOrFeature || '',
      reportedBy: req.user._id
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted successfully.', report });
  } catch (err) {
    console.error('Error submitting bug report:', err);
    res.status(500).json({ message: 'Error submitting report.' });
  }
});

// Get all reports (ADMIN / LAB_HEAD only — future use)
router.get('/', protect, async (req, res) => {
  try {
    const reports = await BugReport.find()
      .populate('reportedBy', 'name role department')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reports.' });
  }
});

// Update report status (ADMIN only — future use)
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const report = await BugReport.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Error updating report.' });
  }
});

module.exports = router;
