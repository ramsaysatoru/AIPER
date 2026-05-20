/**
 * One-time script to fix job distribution statuses that were not correctly
 * updated due to a race condition (instance.save() was called AFTER the
 * job status check query).
 *
 * Run: node scripts/fix-job-statuses.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Job = require('../models/Job');
const TestInstance = require('../models/TestInstance');
const User = require('../models/User');

async function fixJobStatuses() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const jobs = await Job.find({});
  let fixed = 0;

  for (const job of jobs) {
    const allInstances = await TestInstance.find({ jobId: job._id }).populate('createdBy', 'department');
    let changed = false;

    // Check micro
    if (job.distribution.micro.required) {
      const microInstances = allInstances.filter(i =>
        i.createdBy?.department?.toLowerCase() === 'micro'
      );
      if (microInstances.length > 0 && microInstances.every(i => i.status === 'COMPLETED')) {
        if (job.distribution.micro.status !== 'COMPLETED') {
          console.log(`[FIX] Job ${job.jobCode}: micro ${job.distribution.micro.status} → COMPLETED`);
          job.distribution.micro.status = 'COMPLETED';
          changed = true;
        }
      }
    }

    // Check chemical
    if (job.distribution.chemical.required) {
      const chemicalInstances = allInstances.filter(i => {
        const dept = i.createdBy?.department?.toLowerCase();
        return dept === 'chemical';
      });
      if (chemicalInstances.length > 0 && chemicalInstances.every(i => i.status === 'COMPLETED')) {
        if (job.distribution.chemical.status !== 'COMPLETED') {
          console.log(`[FIX] Job ${job.jobCode}: chemical ${job.distribution.chemical.status} → COMPLETED`);
          job.distribution.chemical.status = 'COMPLETED';
          changed = true;
        }
      }
    }

    if (changed) {
      await job.save();
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed} of ${jobs.length} jobs.`);
  await mongoose.disconnect();
}

fixJobStatuses().catch(err => {
  console.error(err);
  process.exit(1);
});
