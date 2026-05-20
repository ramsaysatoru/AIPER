const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['INFO', 'ACTION_REQUIRED', 'SUCCESS', 'WARNING'], 
    default: 'INFO' 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // Optional URL to navigate to
  read: { type: Boolean, default: false },
  relatedJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, // Optional
  relatedInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestInstance' } // Optional
}, { timestamps: true });

// Index for efficient querying of unread notifications for a specific user
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
