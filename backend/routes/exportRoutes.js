const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const HTMLtoDOCX = require('html-to-docx');

router.post('/docx', protect, async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ message: 'HTML content required' });

  try {
    const fileBuffer = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      margins: { top: 720, right: 720, bottom: 720, left: 720 },
      font: 'Times New Roman'
    });

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', 'attachment; filename="report.docx"');
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error generating DOCX via html-to-docx:', error);
    res.status(500).json({ message: 'Failed to generate DOCX', error: error.message });
  }
});

module.exports = router;
