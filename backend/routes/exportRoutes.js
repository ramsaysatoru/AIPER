const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

router.post('/docx', protect, async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ message: 'HTML content required' });

  try {
    const timestamp = Date.now();
    const tempHtmlFile = path.join('/tmp', `report-${timestamp}.html`);
    const tempDocxFile = path.join('/tmp', `report-${timestamp}.docx`);

    // Ensure we have a fully valid HTML structure with the requested font globally applied
    const fullHtml = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { font-family: "Times New Roman", Times, serif !important; }
        </style>
      </head>
      <body>${html}</body>
    </html>`;
    
    fs.writeFileSync(tempHtmlFile, fullHtml);

    // Call LibreOffice headless to convert the HTML to a native OOXML docx
    await exec(`libreoffice --headless --invisible --nodefault --view --nolockcheck --nologo --convert-to "docx:Office Open XML Text" --outdir /tmp ${tempHtmlFile}`);

    // Read the perfectly generated DOCX
    const fileBuffer = fs.readFileSync(tempDocxFile);
    
    // Cleanup temporary files
    try { fs.unlinkSync(tempHtmlFile); } catch (e) {}
    try { fs.unlinkSync(tempDocxFile); } catch (e) {}

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', 'attachment; filename="report.docx"');
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error generating DOCX via LibreOffice:', error);
    res.status(500).json({ message: 'Failed to generate DOCX', error: error.message });
  }
});

module.exports = router;
