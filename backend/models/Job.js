const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // jobCode = YYMMDD + NNNN  e.g. "2605070001"  (10 digits, globally unique)
  jobCode: { type: String, required: true, unique: true },
  // sampleSerial = the 4-digit numeric part, e.g. 1001
  sampleSerial: { type: Number, required: true },

  // Legacy field — kept for backward compat, auto-populated from customer.customer_name on create
  clientName: { type: String },
  totalSampleVolume: { type: Number },

  // --- Parameter System ---
  parameters: [{
    parameterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parameter' },
    name: { type: String },
    type: { type: String, enum: ['Micro', 'Chemical'] },
    unit: { type: String }
  }],

  // --- Customer Information ---
  customer: {
    customer_name:         { type: String, required: true },
    customer_address:      { type: String, required: true },
    contact_person:        { type: String },
    mobile_number:         { type: String, required: true },
    email:                 { type: String },
    customer_reference_no: { type: String }
  },

  // --- Sample Information ---
  sample: {
    sample_name:           { type: String, required: true },
    sample_id:             { type: String, required: true },
    sample_quantity:       { type: String, required: true }, // e.g. "500 ml", "2 kg"
    sample_count:          { type: Number, required: true, min: 1, default: 1 },
    sample_description:    { type: String, required: true },
    condition_on_receipt:  { type: String, required: true },
    packing_details:       { type: String },
    marking_seal:          { type: String },
    sample_source:         { type: String },
    received_date:         { type: Date, required: true },
    received_mode:         { type: String },
    nabl_type:             { type: String, enum: ['Nabl', 'Non Nabl'] },
    ulr_no:                { type: String },
    test_parameters:       [{ type: String }]
  },

  // --- Compliance & Legal Information ---
  compliance: {
    statement_of_conformity:        { type: String },
    decision_rule:                  { type: String },
    accreditation_scope:            { type: String },
    disclaimer_notes:               { type: String },
    special_handling_instructions:  { type: String }
  },
  distribution: {
    micro: {
      required: { type: Boolean, default: false },
      assignedHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['PENDING', 'AWAITING_TRANSFER', 'ASSIGNED_TO_ASSISTANT', 'COMPLETED'], default: 'PENDING' },
      reopenInfo: {
        parentInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestInstance' },
        parentVersion: { type: Number },
        note: { type: String }
      }
    },
    chemical: {
      required: { type: Boolean, default: false },
      assignedHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['PENDING', 'AWAITING_TRANSFER', 'ASSIGNED_TO_ASSISTANT', 'COMPLETED'], default: 'PENDING' },
      reopenInfo: {
        parentInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestInstance' },
        parentVersion: { type: Number },
        note: { type: String }
      }
    }
  },
  sampleFlow: {
    type: { type: String, enum: ['PARALLEL', 'SEQUENTIAL'], default: 'PARALLEL' },
    firstDepartment: { type: String, enum: ['micro', 'chemical'], default: 'micro' },
    transferDeadline: { type: Date }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Retest/Reopen Fields
  isRetest: { type: Boolean, default: false },
  parentJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  reopenReason: { type: String, default: null },
  retestNumber: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
