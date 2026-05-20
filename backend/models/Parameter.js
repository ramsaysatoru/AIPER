const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
  s_no: { type: Number, unique: true },
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Micro', 'Chemical'], required: true },
  unit: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Parameter', parameterSchema);
