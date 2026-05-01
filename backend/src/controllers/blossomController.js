const mongoose = require('mongoose');
const WaterDaily = require('../models/WaterDaily');
const MoodEntry = require('../models/MoodEntry');
const BlossomTask = require('../models/BlossomTask');
const BlossomHabit = require('../models/BlossomHabit');
const BlossomFile = require('../models/BlossomFile');
const BlossomExpense = require('../models/BlossomExpense');

const userId = (req) => req.user._id;

function badObjectId(id) {
  return !id || !mongoose.Types.ObjectId.isValid(id);
}

/** ---------- Water (per local calendar day) ---------- */
exports.getWaterDaily = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Query ?date=YYYY-MM-DD is required' });
    }
    const doc = await WaterDaily.findOne({ user: userId(req), date });
    res.json({
      success: true,
      data: { date, totalMl: doc ? doc.totalMl : 0 },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.putWaterDaily = async (req, res) => {
  try {
    const { date, totalMl } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'body.date YYYY-MM-DD required' });
    }
    const ml = Number(totalMl);
    if (Number.isNaN(ml) || ml < 0 || ml > 20000) {
      return res.status(400).json({ success: false, message: 'totalMl must be 0–20000' });
    }
    const doc = await WaterDaily.findOneAndUpdate(
      { user: userId(req), date },
      { $set: { totalMl: ml } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: { date: doc.date, totalMl: doc.totalMl } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** ---------- Mood ---------- */
exports.getMoodEntries = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const entries = await MoodEntry.find({ user: userId(req) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      success: true,
      data: entries.map((e) => ({
        id: e._id.toString(),
        moodId: e.moodId,
        note: e.note,
        timeLabel: '', // client can format from createdAt
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.postMoodEntry = async (req, res) => {
  try {
    const { moodId, note } = req.body;
    if (!moodId) {
      return res.status(400).json({ success: false, message: 'moodId required' });
    }
    const entry = await MoodEntry.create({
      user: userId(req),
      moodId,
      note: typeof note === 'string' ? note : '',
    });
    res.status(201).json({
      success: true,
      data: {
        id: entry._id.toString(),
        moodId: entry.moodId,
        note: entry.note,
        createdAt: entry.createdAt,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** ---------- Tasks ---------- */
exports.getTasks = async (req, res) => {
  try {
    const tasks = await BlossomTask.find({ user: userId(req) }).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: tasks.map((t) => ({
        id: t._id.toString(),
        title: t.title,
        category: t.category,
        done: t.done,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.postTask = async (req, res) => {
  try {
    const { title, category, done } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'title and category required' });
    }
    const t = await BlossomTask.create({
      user: userId(req),
      title: String(title).trim(),
      category,
      done: !!done,
    });
    res.status(201).json({
      success: true,
      data: { id: t._id.toString(), title: t.title, category: t.category, done: t.done },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.patchTask = async (req, res) => {
  try {
    if (badObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const t = await BlossomTask.findOne({ _id: req.params.id, user: userId(req) });
    if (!t) return res.status(404).json({ success: false, message: 'Task not found' });
    if (req.body.title !== undefined) t.title = String(req.body.title).trim();
    if (req.body.category !== undefined) t.category = req.body.category;
    if (req.body.done !== undefined) t.done = !!req.body.done;
    await t.save();
    res.json({
      success: true,
      data: { id: t._id.toString(), title: t.title, category: t.category, done: t.done },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    if (badObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const r = await BlossomTask.deleteOne({ _id: req.params.id, user: userId(req) });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** ---------- Habits ---------- */
exports.getHabits = async (req, res) => {
  try {
    const habits = await BlossomHabit.find({ user: userId(req) }).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: habits.map((h) => ({
        id: h._id.toString(),
        title: h.title,
        streak: h.streak,
        lastCompletedDate: h.lastCompletedDate,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.postHabit = async (req, res) => {
  try {
    const { title, streak, lastCompletedDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title required' });
    const h = await BlossomHabit.create({
      user: userId(req),
      title: String(title).trim(),
      streak: streak ?? 0,
      lastCompletedDate: lastCompletedDate || null,
    });
    res.status(201).json({
      success: true,
      data: {
        id: h._id.toString(),
        title: h.title,
        streak: h.streak,
        lastCompletedDate: h.lastCompletedDate,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.patchHabit = async (req, res) => {
  try {
    if (badObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const h = await BlossomHabit.findOne({ _id: req.params.id, user: userId(req) });
    if (!h) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.body.title !== undefined) h.title = String(req.body.title).trim();
    if (req.body.streak !== undefined) h.streak = Number(req.body.streak) || 0;
    if (req.body.lastCompletedDate !== undefined) h.lastCompletedDate = req.body.lastCompletedDate;
    await h.save();
    res.json({
      success: true,
      data: {
        id: h._id.toString(),
        title: h.title,
        streak: h.streak,
        lastCompletedDate: h.lastCompletedDate,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteHabit = async (req, res) => {
  try {
    if (badObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const r = await BlossomHabit.deleteOne({ _id: req.params.id, user: userId(req) });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** ---------- Files (metadata only) ---------- */
exports.getFiles = async (req, res) => {
  try {
    const files = await BlossomFile.find({ user: userId(req) }).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: files.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        meta: f.meta,
        emoji: f.emoji,
        tag: f.tag,
        filter: f.filter,
        kind: f.kind,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.postFile = async (req, res) => {
  try {
    const { name, meta, emoji, tag, filter, kind } = req.body;
    if (!name || !tag || !filter || !kind) {
      return res.status(400).json({ success: false, message: 'name, tag, filter, kind required' });
    }
    const f = await BlossomFile.create({
      user: userId(req),
      name: String(name).trim(),
      meta: meta || '',
      emoji: emoji || '📎',
      tag,
      filter,
      kind,
    });
    res.status(201).json({
      success: true,
      data: {
        id: f._id.toString(),
        name: f.name,
        meta: f.meta,
        emoji: f.emoji,
        tag: f.tag,
        filter: f.filter,
        kind: f.kind,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    if (badObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const r = await BlossomFile.deleteOne({ _id: req.params.id, user: userId(req) });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** Legacy docs may still have amountCents; treat as LKR minor units → rupees. */
function amountRupeesFromRow(r) {
  if (typeof r.amountRupees === 'number' && Number.isFinite(r.amountRupees)) {
    return Math.round(r.amountRupees * 100) / 100;
  }
  if (typeof r.amountCents === 'number' && Number.isFinite(r.amountCents)) {
    return Math.round((r.amountCents / 100) * 100) / 100;
  }
  return 0;
}

function normalizeAmountRupeesInput(raw) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded < 0.01 || rounded > 99_999_999.99) return null;
  return rounded;
}

/** ---------- Daily expenses (line items per local calendar day, amounts in LKR rupees) ---------- */
exports.getExpenses = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Query ?date=YYYY-MM-DD is required' });
    }
    const rows = await BlossomExpense.find({ user: userId(req), date })
      .sort({ createdAt: -1 })
      .lean();
    const entries = rows.map((r) => {
      const amountRupees = amountRupeesFromRow(r);
      return {
        id: r._id.toString(),
        label: r.label,
        amountRupees,
      };
    });
    const totalRupees = Math.round(entries.reduce((s, e) => s + e.amountRupees, 0) * 100) / 100;
    res.json({
      success: true,
      data: {
        date,
        totalRupees,
        entries,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.postExpense = async (req, res) => {
  try {
    const { date, label, amountRupees } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'body.date YYYY-MM-DD required' });
    }
    const text = typeof label === 'string' ? label.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, message: 'label required' });
    }
    const ar = normalizeAmountRupeesInput(amountRupees);
    if (ar === null) {
      return res.status(400).json({
        success: false,
        message: 'amountRupees must be between 0.01 and 99999999.99',
      });
    }
    const row = await BlossomExpense.create({
      user: userId(req),
      date,
      label: text,
      amountRupees: ar,
    });
    res.status(201).json({
      success: true,
      data: {
        id: row._id.toString(),
        label: row.label,
        amountRupees: row.amountRupees,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    if (badObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const r = await BlossomExpense.deleteOne({ _id: req.params.id, user: userId(req) });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
