const express = require('express');
const router = express.Router();
const HTMLtoDOCX = require('html-to-docx');
const { protect } = require('../middleware/authMiddleware');

router.post('/docx', protect, async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ message: 'HTML content is required' });
    }

    const fileBuffer = await HTMLtoDOCX(html, null, {
      margins: { top: 720, right: 720, bottom: 720, left: 720 },
      font: 'Times New Roman'
    });

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', 'attachment; filename="report.docx"');
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    res.status(500).json({ message: 'Failed to generate DOCX file' });
  }
});

module.exports = router;
