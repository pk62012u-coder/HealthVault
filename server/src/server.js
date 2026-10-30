import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { User, Record, Share, Appointment, Medication } from './models.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || '';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../private_uploads');

if (JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters. Copy server/.env.example to server/.env and change it.');
  process.exit(1);
}

await fs.mkdir(UPLOAD_DIR, { recursive: true });

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: 'draft-7', legacyHeaders: false }));

// Basic origin check for state-changing browser requests. Add a robust CSRF token strategy before production.
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && origin !== CLIENT_ORIGIN) return res.status(403).json({ message: 'Origin not allowed' });
  }
  next();
});

const authCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 8
};

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

function createToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: '8h', issuer: 'healthvault' });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.hv_session;
    if (!token) return res.status(401).json({ message: 'Please log in.' });
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'healthvault' });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Session is no longer valid.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

function requireRole(role) {
  return (req, res, next) => req.user.role === role
    ? next()
    : res.status(403).json({ message: 'Your account role cannot perform this action.' });
}

function cleanText(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only PDF, JPEG, PNG, and WEBP files are accepted.'), allowed.includes(file.mimetype));
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'HealthVault' }));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 100);
    const email = cleanText(req.body.email, 254).toLowerCase();
    const password = req.body.password;
    const role = req.body.role;
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== 'string' || password.length < 10 || password.length > 128 ||
        !['patient', 'clinician'].includes(role)) {
      return res.status(400).json({ message: 'Enter a valid name/email, password (10+ characters), and role.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with that email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });
    res.cookie('hv_session', createToken(user), authCookie).status(201).json({ user: safeUser(user) });
  } catch (e) { next(e); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = cleanText(req.body.email, 254).toLowerCase();
    const password = req.body.password;
    const user = await User.findOne({ email });
    if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.cookie('hv_session', createToken(user), authCookie).json({ user: safeUser(user) });
  } catch (e) { next(e); }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('hv_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  res.json({ message: 'Logged out.' });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));

// Patients can only list their own records. Clinicians can list only records explicitly shared with them.
app.get('/api/records', requireAuth, async (req, res, next) => {
  try {
    let records;
    if (req.user.role === 'patient') {
      records = await Record.find({ owner: req.user._id }).sort({ recordDate: -1 }).select('-storedName');
    } else {
      const shares = await Share.find({ clinician: req.user._id }).select('record');
      records = await Record.find({ _id: { $in: shares.map(s => s.record) } }).sort({ recordDate: -1 }).select('-storedName');
    }
    res.json({ records });
  } catch (e) { next(e); }
});

app.post('/api/records', requireAuth, requireRole('patient'), upload.single('file'), async (req, res, next) => {
  let storedName;
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a PDF or image file.' });
    const title = cleanText(req.body.title, 120);
    const category = ['Lab report', 'Prescription', 'Medical history', 'Imaging', 'Other'].includes(req.body.category) ? req.body.category : 'Other';
    if (!title) return res.status(400).json({ message: 'Record title is required.' });

    // Random storage names; original file names are never used as paths.
    storedName = crypto.randomUUID();
    const ext = ({ 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[req.file.mimetype];
    await fs.writeFile(path.join(UPLOAD_DIR, storedName + ext), req.file.buffer, { flag: 'wx', mode: 0o600 });
    const record = await Record.create({
      owner: req.user._id, title, category,
      recordDate: req.body.recordDate ? new Date(req.body.recordDate) : new Date(),
      originalName: path.basename(req.file.originalname).slice(0, 180),
      storedName: storedName + ext, mimeType: req.file.mimetype, size: req.file.size
    });
    res.status(201).json({ record: { id: record._id, title: record.title, category: record.category, recordDate: record.recordDate, originalName: record.originalName, mimeType: record.mimeType, size: record.size } });
  } catch (e) {
    if (storedName) {
      try { const names = await fs.readdir(UPLOAD_DIR); for (const n of names.filter(n => n.startsWith(storedName))) await fs.unlink(path.join(UPLOAD_DIR, n)); } catch {}
    }
    next(e);
  }
});

app.get('/api/records/:id/download', requireAuth, async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    let allowed = String(record.owner) === String(req.user._id);
    if (req.user.role === 'clinician') {
      allowed = await Share.exists({ patient: record.owner, clinician: req.user._id, record: record._id });
    }
    if (!allowed) return res.status(403).json({ message: 'This record has not been shared with your account.' });
    const filePath = path.join(UPLOAD_DIR, path.basename(record.storedName));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${record.originalName.replace(/["\r\n]/g, '_')}"`);
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath, err => { if (err && !res.headersSent) next(err); });
  } catch (e) { next(e); }
});

app.delete('/api/records/:id', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, owner: req.user._id });
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    await Share.deleteMany({ record: record._id });
    await Record.deleteOne({ _id: record._id });
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(record.storedName))).catch(() => {});
    res.json({ message: 'Record deleted.' });
  } catch (e) { next(e); }
});

app.get('/api/shares', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const shares = await Share.find({ patient: req.user._id }).populate('clinician', 'name email').populate('record', 'title category recordDate').sort({ createdAt: -1 });
    res.json({ shares: shares.map(s => ({ id: s._id, clinician: s.clinician, record: s.record, grantedAt: s.grantedAt })) });
  } catch (e) { next(e); }
});

app.post('/api/shares', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const record = await Record.findOne({ _id: req.body.recordId, owner: req.user._id });
    if (!record) return res.status(404).json({ message: 'Your record was not found.' });
    const clinician = await User.findOne({ email: cleanText(req.body.clinicianEmail, 254).toLowerCase(), role: 'clinician' });
    if (!clinician) return res.status(404).json({ message: 'No clinician account found for that email.' });
    try {
      const share = await Share.create({ patient: req.user._id, clinician: clinician._id, record: record._id });
      res.status(201).json({ share: { id: share._id, clinician: { name: clinician.name, email: clinician.email }, record: { id: record._id, title: record.title } } });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'This record is already shared with that clinician.' });
      throw e;
    }
  } catch (e) { next(e); }
});

app.delete('/api/shares/:id', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const result = await Share.deleteOne({ _id: req.params.id, patient: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Share permission not found.' });
    res.json({ message: 'Access revoked.' });
  } catch (e) { next(e); }
});

app.get('/api/appointments', requireAuth, async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ owner: req.user._id }).sort({ appointmentAt: 1 });
    res.json({ appointments });
  } catch (e) { next(e); }
});
app.post('/api/appointments', requireAuth, async (req, res, next) => {
  try {
    const clinicianName = cleanText(req.body.clinicianName, 100);
    const department = cleanText(req.body.department, 100) || 'General';
    const appointmentAt = new Date(req.body.appointmentAt);
    if (!clinicianName || Number.isNaN(appointmentAt.getTime())) return res.status(400).json({ message: 'Clinician and a valid appointment date are required.' });
    const appointment = await Appointment.create({ owner: req.user._id, clinicianName, department, appointmentAt });
    res.status(201).json({ appointment });
  } catch (e) { next(e); }
});

app.get('/api/medications', requireAuth, async (req, res, next) => {
  try { res.json({ medications: await Medication.find({ owner: req.user._id }).sort({ createdAt: -1 }) }); }
  catch (e) { next(e); }
});
app.post('/api/medications', requireAuth, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 120);
    const instructions = cleanText(req.body.instructions, 300);
    const reminderTime = cleanText(req.body.reminderTime, 5) || '09:00';
    if (!name || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) return res.status(400).json({ message: 'Enter a medication name and valid reminder time.' });
    const medication = await Medication.create({ owner: req.user._id, name, instructions, reminderTime });
    res.status(201).json({ medication });
  } catch (e) { next(e); }
});
app.patch('/api/medications/:id', requireAuth, async (req, res, next) => {
  try {
    const medication = await Medication.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { active: Boolean(req.body.active) }, { new: true, runValidators: true }
    );
    if (!medication) return res.status(404).json({ message: 'Medication not found.' });
    res.json({ medication });
  } catch (e) { next(e); }
});

// Generic error handling avoids leaking stack traces or database details.
app.use((err, _req, res, _next) => {
  console.error(err.message);
  if (err instanceof multer.MulterError) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File must be 10 MB or smaller.' : 'Upload failed.' });
  if (err.message?.startsWith('Only PDF')) return res.status(400).json({ message: err.message });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: 'Please check the submitted data.' });
  res.status(500).json({ message: 'Something went wrong. Check the server terminal for details.' });
});

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthvault');
  app.listen(PORT, () => console.log(`HealthVault API running at http://localhost:${PORT}`));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
