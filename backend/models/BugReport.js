const mongoose = require('mongoose');

const bugReportSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['BUG', 'FEATURE_REQUEST'], 
    required: true 
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  description: { type: String, required: true },
  pageOrFeature: { type: String, default: '' }, // which page/feature it relates to
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  adminNote: { type: String, default: '' } // for future: dev/admin can add notes
}, { timestamps: true });

module.exports = mongoose.model('BugReport', bugReportSchema);
