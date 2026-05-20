const Notification = require('../models/Notification');
const User = require('../models/User');

let ioInstance = null;
const setNotifierIo = (io) => { ioInstance = io; };

/**
 * Creates a notification in the database.
 * @param {Object} params
 * @param {ObjectId} params.recipient - User ID to receive the notification
 * @param {String} params.type - 'INFO', 'ACTION_REQUIRED', 'SUCCESS', 'WARNING'
 * @param {String} params.title - Short title
 * @param {String} params.message - Detailed message
 * @param {String} [params.link] - Optional frontend route to navigate to
 * @param {ObjectId} [params.relatedJobId] - Optional Job ID
 * @param {ObjectId} [params.relatedInstanceId] - Optional TestInstance ID
 */
const createNotification = async ({ recipient, type = 'INFO', title, message, link, relatedJobId, relatedInstanceId }) => {
  try {
    if (!recipient) return;
    
    await Notification.create({
      recipient,
      type,
      title,
      message,
      link,
      relatedJobId,
      relatedInstanceId
    });

    if (ioInstance) {
      ioInstance.emit('NEW_NOTIFICATION', { recipientId: recipient.toString() });
    }
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

/**
 * Notify all admins
 */
const notifyAdmins = async ({ type = 'INFO', title, message, link, relatedJobId, relatedInstanceId }) => {
  try {
    const admins = await User.find({ role: 'ADMIN' });
    const promises = admins.map(admin => 
      createNotification({ recipient: admin._id, type, title, message, link, relatedJobId, relatedInstanceId })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error('Error notifying admins:', err);
  }
};

/**
 * Notify Lab Head(s) (Assuming usually one or a few)
 */
const notifyLabHeads = async ({ type = 'INFO', title, message, link, relatedJobId, relatedInstanceId }) => {
  try {
    const labHeads = await User.find({ role: 'LAB_HEAD' });
    const promises = labHeads.map(lh => 
      createNotification({ recipient: lh._id, type, title, message, link, relatedJobId, relatedInstanceId })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error('Error notifying lab heads:', err);
  }
};

module.exports = {
  createNotification,
  notifyAdmins,
  notifyLabHeads,
  setNotifierIo
};
