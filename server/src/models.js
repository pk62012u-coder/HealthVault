import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'clinician'], required: true }
}, { timestamps: true });

const recordSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: ['Lab report', 'Prescription', 'Medical history', 'Imaging', 'Other'], default: 'Other' },
  recordDate: { type: Date, default: Date.now },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true }
}, { timestamps: true });

const shareSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clinician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  record: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true },
  grantedAt: { type: Date, default: Date.now }
}, { timestamps: true });
shareSchema.index({ patient: 1, clinician: 1, record: 1 }, { unique: true });

const appointmentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clinicianName: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, trim: true, maxlength: 100, default: 'General' },
  appointmentAt: { type: Date, required: true },
  status: { type: String, enum: ['Upcoming', 'Completed', 'Cancelled'], default: 'Upcoming' },
  notes: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

const medicationSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  instructions: { type: String, trim: true, maxlength: 300, default: '' },
  reminderTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '09:00' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Record = mongoose.model('Record', recordSchema);
export const Share = mongoose.model('Share', shareSchema);
export const Appointment = mongoose.model('Appointment', appointmentSchema);
export const Medication = mongoose.model('Medication', medicationSchema);
