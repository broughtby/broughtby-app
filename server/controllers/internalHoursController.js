const db = require('../config/database');

// Guard against a typo'd year (e.g. 202026). Accepts a "YYYY-MM-DD" string.
const isValidYear = (dateStr) => {
  const year = parseInt(String(dateStr).split('-')[0], 10);
  return Number.isFinite(year) && year >= 2000 && year <= 2100;
};

const parsePositive = (value) => {
  const n = Math.round(parseFloat(value) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : null;
};

const parseNonNegative = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Math.round(parseFloat(value) * 100) / 100;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// Routes are gated by requireAdmin, so every handler can assume an admin user.
const createInternalHours = async (req, res) => {
  try {
    const { personName, workDate, hours, amount, description } = req.body;

    if (!personName || !personName.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!workDate || !isValidYear(workDate)) {
      return res.status(400).json({ error: 'Please enter a valid date' });
    }
    const hrs = parsePositive(hours);
    if (hrs === null) {
      return res.status(400).json({ error: 'Hours must be greater than zero' });
    }
    const amt = parseNonNegative(amount);
    if (amt === null) {
      return res.status(400).json({ error: 'Amount cannot be negative' });
    }

    const result = await db.query(
      `INSERT INTO internal_hours (created_by, person_name, work_date, hours, amount, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, personName.trim(), workDate, hrs, amt, description ? description.trim() : null]
    );

    res.status(201).json({ internalHours: result.rows[0] });
  } catch (error) {
    console.error('Create internal hours error:', error);
    res.status(500).json({ error: 'Failed to add internal hours' });
  }
};

const getInternalHours = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM internal_hours
       WHERE created_by = $1
       ORDER BY work_date DESC, created_at DESC`,
      [req.user.userId]
    );
    res.json({ internalHours: result.rows });
  } catch (error) {
    console.error('Get internal hours error:', error);
    res.status(500).json({ error: 'Failed to fetch internal hours' });
  }
};

const updateInternalHours = async (req, res) => {
  try {
    const { id } = req.params;
    const { personName, workDate, hours, amount, description } = req.body;

    const existing = await db.query(
      'SELECT * FROM internal_hours WHERE id = $1 AND created_by = $2',
      [id, req.user.userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    const current = existing.rows[0];

    if (personName !== undefined && !personName.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (workDate !== undefined && !isValidYear(workDate)) {
      return res.status(400).json({ error: 'Please enter a valid date' });
    }

    let hrs = current.hours;
    if (hours !== undefined) {
      hrs = parsePositive(hours);
      if (hrs === null) {
        return res.status(400).json({ error: 'Hours must be greater than zero' });
      }
    }
    let amt = current.amount;
    if (amount !== undefined) {
      amt = parseNonNegative(amount);
      if (amt === null) {
        return res.status(400).json({ error: 'Amount cannot be negative' });
      }
    }

    const result = await db.query(
      `UPDATE internal_hours
       SET person_name = $1, work_date = $2, hours = $3, amount = $4, description = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        personName !== undefined ? personName.trim() : current.person_name,
        workDate !== undefined ? workDate : current.work_date,
        hrs,
        amt,
        description !== undefined ? (description ? description.trim() : null) : current.description,
        id,
      ]
    );

    res.json({ internalHours: result.rows[0] });
  } catch (error) {
    console.error('Update internal hours error:', error);
    res.status(500).json({ error: 'Failed to update internal hours' });
  }
};

const deleteInternalHours = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM internal_hours WHERE id = $1 AND created_by = $2 RETURNING id',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Delete internal hours error:', error);
    res.status(500).json({ error: 'Failed to delete internal hours' });
  }
};

module.exports = {
  createInternalHours,
  getInternalHours,
  updateInternalHours,
  deleteInternalHours,
};
