const express = require('express');
const router = express.Router();
const SampleTransfer = require('../models/SampleTransfer');
const Job = require('../models/Job');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { createNotification, notifyAdminOfficers, notifyAdmins } = require('../utils/notifier');

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
    
    // Transfers are ALWAYS Micro -> Chemical.
    if (dept !== 'chemical') {
      return res.json([]);
    }
    
    const transfers = await SampleTransfer.find({ toDepartment: 'chemical', status: 'SENT' })
      .populate('sentBy', 'name department')
      .sort({ sentAt: -1 })
      .lean();
      
    // Attach a representative job for UI display
    for (const t of transfers) {
      t.jobId = await Job.findOne({ sampleSerial: t.sampleSerial }, 'jobCode clientName');
    }
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching incoming transfers', error: err.message });
  }
});

// GET pending outgoing transfers for the current HEAD's department
router.get('/outgoing', protect, authorize('HEAD'), async (req, res) => {
  try {
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    
    // Transfers are ALWAYS Micro -> Chemical.
    if (dept !== 'micro') {
      return res.json([]);
    }
    
    // Find multi-department jobs where micro dept is not RETURNED
    const jobs = await Job.find({
      'distribution.micro.required': true,
      'distribution.chemical.required': true,
      'distribution.micro.status': { $ne: 'RETURNED' }
    });

    const uniqueSerials = [...new Set(jobs.map(j => j.sampleSerial))];
    const existingTransfers = await SampleTransfer.find({ sampleSerial: { $in: uniqueSerials } });
    const transferredSerials = new Set(existingTransfers.map(t => t.sampleSerial));
    
    const pendingJobs = [];
    const seenSerials = new Set();
    
    for (const j of jobs) {
      if (!transferredSerials.has(j.sampleSerial) && !seenSerials.has(j.sampleSerial)) {
        pendingJobs.push(j);
        seenSerials.add(j.sampleSerial);
      }
    }
    
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

    if (!job.distribution.micro.required || !job.distribution.chemical.required) {
      return res.status(400).json({ message: 'This job is not a multi-department job — no transfer needed' });
    }

    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    if (dept !== 'micro') {
      return res.status(403).json({ message: 'Only the Micro department can initiate sample transfers to Chemical.' });
    }
    
    const fromDept = 'micro';
    const toDept = 'chemical';

    // Check no existing transfer
    const existing = await SampleTransfer.findOne({ sampleSerial: job.sampleSerial });
    if (existing) {
      return res.status(400).json({ message: 'A transfer has already been initiated for this sample' });
    }

    const transfer = await SampleTransfer.create({
      sampleSerial: job.sampleSerial,
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
        message: `${fromDept.toUpperCase()} dept has taken their portion and sent the sample. Please confirm receipt.`,
        relatedJobId: jobId, // arbitrary sibling job id is fine for UI linking
        link: '/head/dispatcher'
      });
    }

    // Notify Admin Officers & Admins
    const fromLabel = fromDept === 'chemical' ? 'Chemical' : 'Micro';
    const toLabel = toDept === 'chemical' ? 'Chemical' : 'Micro';
    await notifyAdminOfficers({
      type: 'INFO',
      title: 'Sample Transferred',
      message: `Sample #${job.sampleSerial} has been sent from ${fromLabel} to ${toLabel} department by ${req.user.name}.`,
      relatedJobId: jobId
    });
    await notifyAdmins({
      type: 'INFO',
      title: 'Sample Transferred',
      message: `Sample #${job.sampleSerial} has been sent from ${fromLabel} to ${toLabel} department.`,
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
    if (dept !== 'chemical') {
      return res.status(403).json({ message: 'Only the Chemical department can receive sample transfers.' });
    }
    if (transfer.toDepartment !== 'chemical') {
      return res.status(403).json({ message: 'This transfer is not addressed to your department' });
    }

    // Mark transfer as received
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();
    transfer.status = 'RECEIVED';
    await transfer.save();

    const job = await Job.findOne({ sampleSerial: transfer.sampleSerial });

    // Notify everyone
    const fromLabel = transfer.fromDepartment === 'chemical' ? 'Chemical' : 'Micro';
    const toLabel = transfer.toDepartment === 'chemical' ? 'Chemical' : 'Micro';

    await notifyAdminOfficers({
      type: 'SUCCESS',
      title: 'Sample Received',
      message: `${toLabel} HEAD (${req.user.name}) has confirmed receipt of sample #${transfer.sampleSerial}.`,
      relatedJobId: job?._id
    });
    await notifyAdmins({
      type: 'SUCCESS',
      title: 'Sample Received',
      message: `${toLabel} dept confirmed receipt of sample #${transfer.sampleSerial} from ${fromLabel} dept.`,
      relatedJobId: job?._id
    });

    // Notify the Head who originally sent the sample
    await createNotification({
      recipient: transfer.sentBy,
      type: 'SUCCESS',
      title: 'Transfer Receipt Confirmed',
      message: `${toLabel} department has received your sample transfer for sample #${transfer.sampleSerial}.`,
      relatedJobId: job?._id,
      link: '/head/dispatcher'
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
