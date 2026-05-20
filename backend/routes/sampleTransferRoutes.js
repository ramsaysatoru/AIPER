const express = require('express');
const router = express.Router();
const SampleTransfer = require('../models/SampleTransfer');
const Job = require('../models/Job');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { createNotification, notifyLabHeads, notifyAdmins } = require('../utils/notifier');

// GET transfer history for a job
router.get('/', protect, async (req, res) => {
  try {
    const { jobId } = req.query;
    const query = jobId ? { jobId } : {};
    const transfers = await SampleTransfer.find(query)
      .populate('sentBy', 'name department')
      .populate('receivedBy', 'name department')
      .sort({ createdAt: -1 });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching transfers', error: err.message });
  }
});

// GET pending incoming transfers for the current HEAD's department
router.get('/incoming', protect, authorize('HEAD'), async (req, res) => {
  try {
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const toDept = (dept === 'chemical') ? 'chemical' : 'micro';
    
    const transfers = await SampleTransfer.find({ toDepartment: toDept, status: 'SENT' })
      .populate('sentBy', 'name department')
      .populate('jobId', 'jobCode clientName')
      .sort({ sentAt: -1 });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching incoming transfers', error: err.message });
  }
});

// GET pending outgoing transfers for the current HEAD's department
router.get('/outgoing', protect, authorize('HEAD'), async (req, res) => {
  try {
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const fromDept = (dept === 'chemical') ? 'chemical' : 'micro';
    
    // Find jobs where this dept is done, flow is SEQUENTIAL, this dept is first, and no transfer sent yet
    const jobs = await Job.find({
      'sampleFlow.type': 'SEQUENTIAL',
      'sampleFlow.firstDepartment': fromDept,
      [`distribution.${fromDept}.status`]: 'COMPLETED'
    });

    // Filter out jobs that already have a transfer record
    const jobIds = jobs.map(j => j._id);
    const existingTransfers = await SampleTransfer.find({ jobId: { $in: jobIds } });
    const transferredJobIds = new Set(existingTransfers.map(t => t.jobId.toString()));
    
    const pendingJobs = jobs.filter(j => !transferredJobIds.has(j._id.toString()));
    
    res.json(pendingJobs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching outgoing transfers', error: err.message });
  }
});

// POST — HEAD sends sample to another department
router.post('/', protect, authorize('HEAD'), async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.sampleFlow?.type !== 'SEQUENTIAL') {
      return res.status(400).json({ message: 'This job uses parallel flow — no transfer needed' });
    }

    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const fromDept = (dept === 'chemical') ? 'chemical' : 'micro';
    const toDept = fromDept === 'micro' ? 'chemical' : 'micro';

    // Validate sender's department is the first and is completed
    if (job.sampleFlow.firstDepartment !== fromDept) {
      return res.status(400).json({ message: 'Your department is not the first in the sequential flow' });
    }
    if (job.distribution[fromDept]?.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Your department has not completed testing yet' });
    }

    // Check no existing transfer
    const existing = await SampleTransfer.findOne({ jobId });
    if (existing) {
      return res.status(400).json({ message: 'A transfer has already been initiated for this job' });
    }

    const transfer = await SampleTransfer.create({
      jobId,
      fromDepartment: fromDept,
      toDepartment: toDept,
      sentBy: req.user._id,
      sentAt: new Date()
    });

    // Notify receiving department's HEAD(s)
    const toDeptName = toDept === 'chemical' ? 'chemical' : 'micro';
    const receivingHeads = await User.find({ role: 'HEAD', department: { $regex: new RegExp(`^(${toDeptName}|${toDept})$`, 'i') } });
    for (const head of receivingHeads) {
      await createNotification({
        recipient: head._id,
        type: 'ACTION_REQUIRED',
        title: 'Sample Transfer — Action Required',
        message: `${fromDept.toUpperCase()} dept has completed testing and sent the sample for job ${job.jobCode}. Please confirm receipt.`,
        relatedJobId: jobId,
        link: '/head/dispatcher'
      });
    }

    // Notify Lab Heads & Admins
    const fromLabel = fromDept === 'chemical' ? 'Chemical' : 'Micro';
    const toLabel = toDept === 'chemical' ? 'Chemical' : 'Micro';
    await notifyLabHeads({
      type: 'INFO',
      title: 'Sample Transferred',
      message: `Sample for job ${job.jobCode} has been sent from ${fromLabel} to ${toLabel} department by ${req.user.name}.`,
      relatedJobId: jobId
    });
    await notifyAdmins({
      type: 'INFO',
      title: 'Sample Transferred',
      message: `Sample for job ${job.jobCode} has been sent from ${fromLabel} to ${toLabel} department.`,
      relatedJobId: jobId
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('TRANSFER_INITIATED');
    }

    res.status(201).json(transfer);
  } catch (err) {
    res.status(500).json({ message: 'Error initiating transfer', error: err.message });
  }
});

// PUT — Receiving HEAD confirms receipt
router.put('/:id/receive', protect, authorize('HEAD'), async (req, res) => {
  try {
    const transfer = await SampleTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status !== 'SENT') {
      return res.status(400).json({ message: 'Transfer already confirmed' });
    }

    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const myDept = (dept === 'chemical') ? 'chemical' : 'micro';
    if (transfer.toDepartment !== myDept) {
      return res.status(403).json({ message: 'This transfer is not addressed to your department' });
    }

    // Mark transfer as received
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();
    transfer.status = 'RECEIVED';
    await transfer.save();

    // Unlock the receiving department's distribution: AWAITING_TRANSFER → PENDING
    const job = await Job.findById(transfer.jobId);
    if (job && job.distribution[myDept]) {
      job.distribution[myDept].status = 'PENDING';
      await job.save();
    }

    // Notify everyone
    const fromLabel = transfer.fromDepartment === 'chemical' ? 'Chemical' : 'Micro';
    const toLabel = transfer.toDepartment === 'chemical' ? 'Chemical' : 'Micro';

    await notifyLabHeads({
      type: 'SUCCESS',
      title: 'Sample Received',
      message: `${toLabel} HEAD (${req.user.name}) has confirmed receipt of sample for job ${job.jobCode}.`,
      relatedJobId: transfer.jobId
    });
    await notifyAdmins({
      type: 'SUCCESS',
      title: 'Sample Received',
      message: `${toLabel} dept confirmed receipt of sample for job ${job.jobCode} from ${fromLabel} dept.`,
      relatedJobId: transfer.jobId
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('TRANSFER_RECEIVED');
    }

    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: 'Error confirming receipt', error: err.message });
  }
});

module.exports = router;
