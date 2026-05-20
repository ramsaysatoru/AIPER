require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for migration'))
  .catch(err => console.error('MongoDB connection error:', err));

async function migrate() {
  const db = mongoose.connection.db;

  try {
    // 1. Update Users
    const usersResult = await db.collection('users').updateMany(
      { department: 'Macro' },
      { $set: { department: 'Chemical' } }
    );
    console.log(`Updated ${usersResult.modifiedCount} users from Macro to Chemical.`);

    // 2. Update Jobs
    // Rename distribution.macro to distribution.chemical
    const jobsResult1 = await db.collection('jobs').updateMany(
      { 'distribution.macro': { $exists: true } },
      { $rename: { 'distribution.macro': 'distribution.chemical' } }
    );
    console.log(`Renamed distribution.macro to distribution.chemical in ${jobsResult1.modifiedCount} jobs.`);

    // Update sampleFlow.firstDepartment
    const jobsResult2 = await db.collection('jobs').updateMany(
      { 'sampleFlow.firstDepartment': 'macro' },
      { $set: { 'sampleFlow.firstDepartment': 'chemical' } }
    );
    console.log(`Updated sampleFlow.firstDepartment to chemical in ${jobsResult2.modifiedCount} jobs.`);

    // 3. Update SampleTransfers
    const transfersResult1 = await db.collection('sampletransfers').updateMany(
      { fromDepartment: 'macro' },
      { $set: { fromDepartment: 'chemical' } }
    );
    console.log(`Updated fromDepartment to chemical in ${transfersResult1.modifiedCount} transfers.`);

    const transfersResult2 = await db.collection('sampletransfers').updateMany(
      { toDepartment: 'macro' },
      { $set: { toDepartment: 'chemical' } }
    );
    console.log(`Updated toDepartment to chemical in ${transfersResult2.modifiedCount} transfers.`);

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

mongoose.connection.once('open', migrate);
