const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, adminOrHead } = require('../middlewares/authMiddleware');
const Job = require('../models/Job');
const TestInstance = require('../models/TestInstance');
const { generateReport } = require('../services/reportGenerator');
const { uploadCustomReport, downloadCustomReport, deleteCustomReport, getReportStatus } = require('../services/reportStorage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for .docx
});

/**
 * Helper to fetch a fully populated job
 */
const getPopulatedJob = async (jobId) => {
  return await Job.findById(jobId)
    .populate('createdBy', 'name email role')
    .populate('distribution.micro.assignedHead', 'name')
    .populate('distribution.chemical.assignedHead', 'name')
    .populate('parameters.parameterId', 'name type unit');
};

const attachResultsToJob = async (job) => {
  const jobObj = job.toObject();
  const instances = await TestInstance.find({ jobId: job._id }).sort({ version: -1 });
  
  // Create a map of parameterId -> result for quick lookup
  const resultMap = {};
  instances.forEach(inst => {
    // We only want the latest active instance per department, so we can just grab results
    inst.results.forEach(r => {
      resultMap[r.parameterId.toString()] = {
        value: r.value,
        testMethod: r.testMethod,
        specification: r.specification // in case they filled it dynamically, though we prefer the static one in job
      };
    });
  });

  const mergeResults = (params) => {
    if (!params) return [];
    return params.map(p => {
      const pId = p.parameterId ? p.parameterId._id.toString() : null;
      const resData = pId ? resultMap[pId] : null;
      return {
        ...p,
        value: resData?.value || '',
        testMethod: resData?.testMethod || '',
        specification: p.specification || resData?.specification || ''
      };
    });
  };

  jobObj.parameters = mergeResults(jobObj.parameters);

  return jobObj;
};

/**
 * @desc Get the report (Custom if exists, else Auto-generated)
 * @route GET /api/export/report/:jobId
 * @query type - 'nabl' or 'non_nabl'
 */
router.get('/report/:jobId', protect, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { type = 'non_nabl' } = req.query;

    let job = await getPopulatedJob(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job = await attachResultsToJob(job);

    // 1. Check for custom report in GridFS
    const customReport = await downloadCustomReport(jobId, type);

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    if (customReport) {
      // Stream custom report
      const filename = `Report_${job.jobCode}_${type}_Custom.docx`;
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
      return customReport.stream.pipe(res);
    }

    // 2. Fallback to generating on the fly
    const buffer = await generateReport(job, type);
    const filename = `Report_${job.jobCode}_${type}.docx`;
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error serving DOCX report:', error);
    res.status(500).json({ message: 'Failed to serve report', error: error.message });
  }
});

/**
 * @desc Upload a custom .docx report
 * @route POST /api/export/report/:jobId/upload
 * @query type - 'nabl' or 'non_nabl'
 */
router.post('/report/:jobId/upload', protect, upload.single('reportDoc'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { type = 'non_nabl' } = req.query;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Must be .docx
    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return res.status(400).json({ message: 'Only .docx files are allowed' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Optional: we can delete the old custom one to save space
    await deleteCustomReport(jobId, type);

    const filename = `Custom_${job.jobCode}_${type}.docx`;
    const metadata = {
      jobId,
      reportType: type,
      uploadedBy: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    };

    const fileId = await uploadCustomReport(req.file.buffer, filename, metadata);

    res.json({ message: 'Custom report uploaded successfully', fileId });
  } catch (error) {
    console.error('Error uploading custom report:', error);
    res.status(500).json({ message: 'Failed to upload report', error: error.message });
  }
});

/**
 * @desc Revert to auto-generated report (Delete custom)
 * @route POST /api/export/report/:jobId/revert
 * @query type - 'nabl' or 'non_nabl'
 */
router.post('/report/:jobId/revert', protect, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { type = 'non_nabl' } = req.query;

    await deleteCustomReport(jobId, type);

    res.json({ message: 'Reverted to auto-generated report successfully' });
  } catch (error) {
    console.error('Error reverting report:', error);
    res.status(500).json({ message: 'Failed to revert report', error: error.message });
  }
});

/**
 * @desc Get the status of the report (Custom or Auto)
 * @route GET /api/export/report/:jobId/status
 * @query type - 'nabl' or 'non_nabl'
 */
router.get('/report/:jobId/status', protect, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { type = 'non_nabl' } = req.query;

    const status = await getReportStatus(jobId, type);
    res.json(status);
  } catch (error) {
    console.error('Error fetching report status:', error);
    res.status(500).json({ message: 'Failed to fetch report status', error: error.message });
  }
});

module.exports = router;
