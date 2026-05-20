const mongoose = require('mongoose');
const Job = require('./models/Job');
const TestInstance = require('./models/TestInstance');
mongoose.connect('mongodb://localhost:27017/foodlab')
.then(async () => {
  const jobs = await Job.find({ jobCode: { $regex: /260508/ } }).limit(5);
  console.log('JOBS:', JSON.stringify(jobs, null, 2));
  process.exit(0);
});
