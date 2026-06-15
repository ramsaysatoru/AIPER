const mongoose = require('mongoose');

const sampleCounterSchema = new mongoose.Schema({
  currentValue: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SampleCounter', sampleCounterSchema);
