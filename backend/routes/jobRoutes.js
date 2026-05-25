const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const TestInstance = require('../models/TestInstance');
const SampleTransfer = require('../models/SampleTransfer');
const Notification = require('../models/Notification');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { createNotification, notifyAdmins } = require('../utils/notifier');
const User = require('../models/User');
const UlrCounter = require('../models/UlrCounter');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a 10-digit job code:  YYMMDD + 4-digit zero-padded serial
 * e.g. serial 1001 on 7 May 2026  →  "2605071001"
 */
function buildJobCode(serial) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const nn = String(serial).padStart(4, '0');
  return `${yy}${mm}${dd}${nn}`;
}

/**
 * Return the next sample serial by looking at the highest sampleSerial
 * already in the DB, or falling back to SAMPLE_ID_START from .env.
 */
async function getNextSerial() {
  const start = parseInt(process.env.SAMPLE_ID_START || '1001', 10);
  const last = await Job.findOne({}, { sampleSerial: 1 }, { sort: { sampleSerial: -1 } });
  return last && last.sampleSerial ? last.sampleSerial + 1 : start;
}

/**
 * Atomically increment and return the next ULR string.
 */
async function getNextUlr() {
  const counter = await UlrCounter.findOneAndUpdate(
    {},
    { $inc: { currentValue: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const numStr = String(counter.currentValue).padStart(8, '0');
  return `${counter.prefix}${numStr}${counter.suffix}`;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/jobs/next-sample-id
 * Returns the next sampleSerial so the form can pre-fill the Sample ID field.
 * Public to any authenticated user so the Admin Officer form can fetch it.
 */
router.get('/next-sample-id', protect, async (req, res) => {
  try {
    const serial = await getNextSerial();
    res.json({ serial, padded: String(serial).padStart(4, '0') });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating next sample ID', error: err.message });
  }
});

/**
 * GET /api/jobs/next-ulr
 * Returns a preview of the next ULR string.
 */
router.get('/next-ulr', protect, async (req, res) => {
  try {
    const counter = await UlrCounter.findOne({}) || { prefix: 'TC-12434260', currentValue: 0, suffix: 'F' };
    const numStr = String(counter.currentValue).padStart(8, '0');
    res.json({ ulr: `${counter.prefix}${numStr}${counter.suffix}`, currentValue: counter.currentValue });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating next ULR', error: err.message });
  }
});

/**
 * PUT /api/jobs/ulr-offset
 * Adjusts the offset value for the ULR counter.
 */
router.put('/ulr-offset', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
  try {
    const { offset } = req.body;
    const counter = await UlrCounter.findOneAndUpdate(
      {},
      { $set: { currentValue: parseInt(offset, 10), offset: 0 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ message: 'ULR value updated', currentValue: counter.currentValue });
  } catch (err) {
    res.status(500).json({ message: 'Error updating ULR offset', error: err.message });
  }
});

// Get all jobs based on role
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'HEAD') {
      const dept = req.user.department ? req.user.department.toLowerCase() : '';
      if (dept === 'micro') {
        query = { 'distribution.micro.required': true };
      } else if (dept === 'chemical') {
        query = { 'distribution.chemical.required': true };
      } else {
        query = { _id: null };
      }
    }
    // ADMIN_OFFICER and ADMIN see all jobs.
    const jobs = await Job.find(query)
      .populate('createdBy', 'name email')
      .populate('parameters.parameterId', 'name unit type')
      .populate('distribution.micro.assignedHead', 'name email')
      .populate('distribution.chemical.assignedHead', 'name email')
      .populate('siblingJobId', 'jobCode')
      .sort({ createdAt: -1 });

    // Attach test instances for timeline view
    const jobsWithTimeline = await Promise.all(jobs.map(async (job) => {
      const instances = await TestInstance.find({ jobId: job._id })
        .populate('assignedTo', 'name')
        .populate('createdBy', 'name department')
        .populate('reviewHistory.by', 'name')
        .sort({ createdAt: 1 });
      const transfers = await SampleTransfer.find({ jobId: job._id })
        .populate('sentBy', 'name department')
        .populate('receivedBy', 'name department')
        .sort({ createdAt: 1 });
      return { ...job.toObject(), testInstances: instances, sampleTransfers: transfers };
    }));
    return res.json(jobsWithTimeline);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs' });
  }
});

// Create a new job (ADMIN_OFFICER only)
router.post('/', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
  try {
    const { customer, sample, compliance, parameters, sampleFlow, assignedMicroHead, assignedChemicalHead, nablMode, nablParameters, nonNablParameters } = req.body;

    const serial = await getNextSerial();
    const baseJobCode = buildJobCode(serial);

    const sampleWithId = {
      ...sample,
      sample_id: String(serial).padStart(4, '0')
    };

    const flowType = sampleFlow?.type || 'PARALLEL';
    const firstDept = sampleFlow?.firstDepartment || 'micro';
    
    // Helper to determine distribution object for a set of parameters
    const getDistribution = (params) => {
      const hasMicro = params && params.some(p => p.type === 'Micro');
      const hasChemical = params && params.some(p => p.type === 'Chemical');
      
      let microStatus = 'PENDING';
      let chemicalStatus = 'PENDING';
      
      // If both departments are required, Micro ALWAYS gets it first. Chemical must wait.
      if (hasMicro && hasChemical) {
        chemicalStatus = 'AWAITING_TRANSFER';
      }

      return {
        micro: { required: hasMicro, status: hasMicro ? microStatus : 'PENDING', assignedHead: assignedMicroHead || null },
        chemical: { required: hasChemical, status: hasChemical ? chemicalStatus : 'PENDING', assignedHead: assignedChemicalHead || null }
      };
    };

    // Helper to send notifications for a job
    const sendNotifications = async (createdJob, params, dist) => {
      const hasMicro = dist.micro.required;
      const hasChemical = dist.chemical.required;
      const isSequential = flowType === 'SEQUENTIAL' && hasMicro && hasChemical;

      await notifyAdmins({
        type: 'INFO',
        title: 'New Job Logged',
        message: `Job ${createdJob.jobCode} (Sample #${serial}) for ${customer?.customer_name} has been created.${(hasMicro && hasChemical) ? ` Flow: Sequential (Micro first).` : ''}`,
        relatedJobId: createdJob._id
      });

      if (hasMicro && dist.micro.status !== 'AWAITING_TRANSFER') {
        const microHeads = await User.find({ role: 'HEAD', department: { $regex: /^micro$/i } });
        for (const head of microHeads) {
          await createNotification({
            recipient: head._id, type: 'ACTION_REQUIRED', title: 'New Job Available',
            message: `Job ${createdJob.jobCode} requires MICRO analysis. Child code: ${createdJob.jobCode}-1`,
            relatedJobId: createdJob._id, link: '/head/dispatcher'
          });
        }
      }

      if (hasChemical && dist.chemical.status !== 'AWAITING_TRANSFER') {
        const chemicalHeads = await User.find({ role: 'HEAD', department: { $regex: /^(chemical|chemical)$/i } });
        for (const head of chemicalHeads) {
          await createNotification({
            recipient: head._id, type: 'ACTION_REQUIRED', title: 'New Job Available',
            message: `Job ${createdJob.jobCode} requires CHEMICAL analysis. Child code: ${createdJob.jobCode}-2`,
            relatedJobId: createdJob._id, link: '/head/dispatcher'
          });
        }
      }
    };

    let createdJobs = [];

    if (nablMode === 'hybrid') {
      const ulr = await getNextUlr();
      const nablDist = getDistribution(nablParameters);
      const nonNablDist = getDistribution(nonNablParameters);

      // Create NABL job
      const nablJob = await Job.create({
        jobCode: `${baseJobCode}-N1`,
        sampleSerial: serial,
        clientName: customer?.customer_name || '',
        totalSampleVolume: parseFloat(sample?.sample_quantity) || 0,
        customer,
        sample: { ...sampleWithId, nabl_type: 'Nabl', ulr_no: ulr },
        compliance,
        parameters: nablParameters,
        distribution: nablDist,
        sampleFlow: (nablDist.micro.required && nablDist.chemical.required) ? { type: 'SEQUENTIAL', firstDepartment: 'micro', transferDeadline: sampleFlow?.transferDeadline || null } : undefined,
        createdBy: req.user._id
      });

      // Create Non-NABL job
      const nonNablJob = await Job.create({
        jobCode: `${baseJobCode}-N2`,
        sampleSerial: serial,
        clientName: customer?.customer_name || '',
        totalSampleVolume: parseFloat(sample?.sample_quantity) || 0,
        customer,
        sample: { ...sampleWithId, nabl_type: 'Non Nabl', ulr_no: null },
        compliance,
        parameters: nonNablParameters,
        distribution: nonNablDist,
        sampleFlow: (nonNablDist.micro.required && nonNablDist.chemical.required) ? { type: 'SEQUENTIAL', firstDepartment: 'micro', transferDeadline: sampleFlow?.transferDeadline || null } : undefined,
        createdBy: req.user._id,
        siblingJobId: nablJob._id
      });

      // Update NABL job with sibling link
      nablJob.siblingJobId = nonNablJob._id;
      await nablJob.save();

      await sendNotifications(nablJob, nablParameters, nablDist);
      await sendNotifications(nonNablJob, nonNablParameters, nonNablDist);
      createdJobs = [nablJob, nonNablJob];

    } else {
      // nabl or non_nabl
      const isNabl = nablMode === 'nabl';
      const ulr = isNabl ? await getNextUlr() : null;
      const dist = getDistribution(parameters);

      const job = await Job.create({
        jobCode: baseJobCode,
        sampleSerial: serial,
        clientName: customer?.customer_name || '',
        totalSampleVolume: parseFloat(sample?.sample_quantity) || 0,
        customer,
        sample: { ...sampleWithId, nabl_type: isNabl ? 'Nabl' : 'Non Nabl', ulr_no: ulr },
        compliance,
        parameters,
        distribution: dist,
        sampleFlow: (dist.micro.required && dist.chemical.required) ? { type: 'SEQUENTIAL', firstDepartment: 'micro', transferDeadline: sampleFlow?.transferDeadline || null } : undefined,
        createdBy: req.user._id
      });

      await sendNotifications(job, parameters, dist);
      createdJobs = [job];
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('JOB_CREATED'); // Not emitting specific job since it could be multiple
    }

    res.status(201).json(createdJobs.length === 1 ? createdJobs[0] : createdJobs);
  } catch (error) {
    res.status(500).json({ message: 'Error creating job', error: error.message });
  }
});

// Update an existing job (ADMIN_OFFICER only)
router.put('/:id', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only allow editing if the job is not fully complete?
    // User requested "once the entire process is done, job form must be made immutable".
    // For now, if the distribution has completed statuses for everything required, it's immutable.
    const isMicroDone = !job.distribution.micro.required || job.distribution.micro.status === 'COMPLETED';
    const isChemicalDone = !job.distribution.chemical.required || job.distribution.chemical.status === 'COMPLETED';
    
    if (isMicroDone && isChemicalDone) {
      return res.status(400).json({ message: 'Job is complete and immutable.' });
    }

    const { customer, sample, compliance } = req.body;

    // We only update customer, sample, and compliance. We don't touch parameters, distribution, or flow
    if (customer) job.customer = customer;
    if (sample) job.sample = sample;
    if (compliance) job.compliance = compliance;

    if (customer && customer.customer_name) {
      job.clientName = customer.customer_name;
    }
    if (sample && sample.sample_quantity) {
      job.totalSampleVolume = parseFloat(sample.sample_quantity) || 0;
    }

    await job.save();

    if (req.app.get('io')) {
      // Notify clients that jobs have changed (could use a specific JOB_UPDATED event)
      req.app.get('io').emit('JOB_CREATED'); // Re-using this event will force refresh the table
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error updating job', error: error.message });
  }
});

// Spawn a Child Retest Job (ADMIN_OFFICER only)
router.post('/:id/retest', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
  try {
    const parentJob = await Job.findById(req.params.id);
    if (!parentJob) return res.status(404).json({ message: 'Job not found' });

    const rootJobId = parentJob.isRetest ? parentJob.parentJobId : parentJob._id;
    if (!rootJobId) {
      console.error('RETEST ERROR: Missing rootJobId for parentJob', parentJob._id);
      return res.status(400).json({ message: 'Invalid job lineage: Missing parent ID' });
    }
    const rootJob = await Job.findById(rootJobId);
    if (!rootJob) {
      console.error('RETEST ERROR: Root job not found for ID', rootJobId);
      return res.status(404).json({ message: 'Root job not found for this retest' });
    }
    
    const retestCount = await Job.countDocuments({ parentJobId: rootJobId });
    const retestNumber = retestCount + 1;
    const jobCode = `${rootJob.jobCode}-retest-${retestNumber}`;

    const { customer, sample, compliance, parameters, reopenReason } = req.body;

    if (!parameters || !Array.isArray(parameters)) {
      return res.status(400).json({ message: 'Parameters are required for retest' });
    }

    const hasMicro = parameters.some(p => p.type && p.type.toLowerCase() === 'micro');
    const hasChemical = parameters.some(p => p.type && p.type.toLowerCase() !== 'micro');

    const job = new Job({
      jobCode,
      sampleSerial: rootJob.sampleSerial,
      clientName: customer?.customer_name || 'N/A',
      totalSampleVolume: parseFloat(sample.sample_quantity) || 0,
      customer,
      sample,
      compliance,
      parameters,
      distribution: {
        micro: { required: hasMicro, status: 'PENDING' },
        chemical: { required: hasChemical, status: 'PENDING' }
      },
      createdBy: req.user._id,
      isRetest: true,
      parentJobId: rootJobId,
      reopenReason: reopenReason,
      retestNumber: retestNumber
    });

    await job.save();

    // Mark parent job's completed instances as REOPENED to trigger timeline UI changes
    await TestInstance.updateMany(
      { jobId: parentJob._id, status: 'COMPLETED' },
      { $set: { status: 'REOPENED', reopenNote: reopenReason, reopenedBy: req.user._id } }
    );

    // Notifications
    if (hasMicro) {
      const microHeads = await User.find({ role: 'HEAD', department: { $regex: /^micro/i } });
      for (const head of microHeads) {
        await createNotification({ recipient: head._id, type: 'ACTION_REQUIRED', title: 'Retest Available', message: `Job ${jobCode} requires MICRO retest.`, relatedJobId: job._id, link: '/head/dispatcher' });
      }
    }
    if (hasChemical) {
      const chemicalHeads = await User.find({ role: 'HEAD', department: { $regex: /^(chemical|chemical)$/i } });
      for (const head of chemicalHeads) {
        await createNotification({ recipient: head._id, type: 'ACTION_REQUIRED', title: 'Retest Available', message: `Job ${jobCode} requires CHEMICAL retest.`, relatedJobId: job._id, link: '/head/dispatcher' });
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('JOB_RETEST_INITIATED');
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('RETEST ERROR:', error);
    res.status(500).json({ 
      message: 'Error creating retest job', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Delete a job
router.delete('/:id', protect, authorize('ADMIN_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Delete associated TestInstances
    await TestInstance.deleteMany({ jobId: job._id });
    
    // Delete associated Notifications
    await Notification.deleteMany({ relatedJobId: job._id });

    // Delete the job itself
    await Job.findByIdAndDelete(job._id);

    res.json({ message: 'Job and associated records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting job', error: error.message });
  }
});

module.exports = router;
