const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  dueDate: { type: Date },
  description: { type: String },
  status: { type: String, ref: 'Status', required: true },
  previousStatus: { type: String, ref: 'Status' },
  prev: { type: String, ref: 'Task' },
  next: { type: String, ref: 'Task' },
  userId: { type: String, ref: 'UserAuth', required: true }
}, { timestamps: true, strict: 'throw' });

module.exports = mongoose.model('Task', taskSchema);