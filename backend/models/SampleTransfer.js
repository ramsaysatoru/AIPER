const mongoose = require('mongoose');

const sampleTransferSchema = new mongoose.Schema({
  sampleSerial:   { type: Number, required: true },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  fromDepartment: { type: String, enum: ['micro', 'chemical'], required: true },
  toDepartment:   { type: String, enum: ['micro', 'chemical'], required: true },
  sentBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentAt:         { type: Date, required: true },
  receivedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedAt:     { type: Date },
  status:         { type: String, enum: ['SENT', 'RECEIVED', 'CANCELLED'], default: 'SENT' }
}, { timestamps: true });

sampleTransferSchema.index({ sampleSerial: 1, status: 1 });

module.exports = mongoose.model('SampleTransfer', sampleTransferSchema);
