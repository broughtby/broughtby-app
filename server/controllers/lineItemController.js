const db = require('../config/database');

const VALID_CATEGORIES = ['commission', 'reimbursement'];

// Guard against a typo'd year (e.g. 202026) that would silently drop the item
// out of any month/year-filtered view. Accepts a "YYYY-MM-DD" string.
const isValidYear = (dateStr) => {
  const year = parseInt(String(dateStr).split('-')[0], 10);
  return Number.isFinite(year) && year >= 2000 && year <= 2100;
};

// Normalize the amount to a positive number with cents, or null if invalid.
const parseAmount = (value) => {
  const amount = Math.round(parseFloat(value) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
};

// Brands add line items for ambassadors they are matched with.
const createLineItem = async (req, res) => {
  try {
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can add line items' });
    }

    const { ambassadorId, itemDate, category, description, amount } = req.body;

    if (!ambassadorId || !itemDate || !category || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (!isValidYear(itemDate)) {
      return res.status(400).json({ error: 'Please enter a valid date' });
    }
    const cents = parseAmount(amount);
    if (cents === null) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    // The brand may only add items for an ambassador they are matched with
    const match = await db.query(
      'SELECT id FROM matches WHERE brand_id = $1 AND ambassador_id = $2',
      [req.user.userId, ambassadorId]
    );
    if (match.rows.length === 0) {
      return res.status(400).json({ error: 'You are not connected with that ambassador' });
    }

    const result = await db.query(
      `INSERT INTO line_items (brand_id, ambassador_id, item_date, category, description, amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, ambassadorId, itemDate, category, description || null, cents]
    );

    res.status(201).json({ lineItem: result.rows[0] });
  } catch (error) {
    console.error('Create line item error:', error);
    res.status(500).json({ error: 'Failed to add line item' });
  }
};

// Both roles list their own line items; joins differ so each side sees the
// counterpart's name (mirrors getBookings).
const getLineItems = async (req, res) => {
  try {
    let query;
    if (req.user.role === 'brand') {
      query = `
        SELECT li.*, u.name AS ambassador_name, u.profile_photo AS ambassador_photo
        FROM line_items li
        JOIN users u ON li.ambassador_id = u.id
        WHERE li.brand_id = $1
        ORDER BY li.item_date DESC, li.created_at DESC
      `;
    } else {
      query = `
        SELECT li.*, b.name AS brand_name, b.company_name,
               u.name AS ambassador_name
        FROM line_items li
        JOIN users b ON li.brand_id = b.id
        JOIN users u ON li.ambassador_id = u.id
        WHERE li.ambassador_id = $1
        ORDER BY li.item_date DESC, li.created_at DESC
      `;
    }

    const result = await db.query(query, [req.user.userId]);
    res.json({ lineItems: result.rows });
  } catch (error) {
    console.error('Get line items error:', error);
    res.status(500).json({ error: 'Failed to fetch line items' });
  }
};

const updateLineItem = async (req, res) => {
  try {
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can edit line items' });
    }

    const { id } = req.params;
    const { itemDate, category, description, amount } = req.body;

    const existing = await db.query(
      'SELECT * FROM line_items WHERE id = $1 AND brand_id = $2',
      [id, req.user.userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found' });
    }
    const current = existing.rows[0];

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (itemDate !== undefined && !isValidYear(itemDate)) {
      return res.status(400).json({ error: 'Please enter a valid date' });
    }

    let cents = current.amount;
    if (amount !== undefined) {
      cents = parseAmount(amount);
      if (cents === null) {
        return res.status(400).json({ error: 'Amount must be greater than zero' });
      }
    }

    const result = await db.query(
      `UPDATE line_items
       SET item_date = $1, category = $2, description = $3, amount = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [
        itemDate !== undefined ? itemDate : current.item_date,
        category !== undefined ? category : current.category,
        description !== undefined ? description : current.description,
        cents,
        id,
      ]
    );

    res.json({ lineItem: result.rows[0] });
  } catch (error) {
    console.error('Update line item error:', error);
    res.status(500).json({ error: 'Failed to update line item' });
  }
};

const deleteLineItem = async (req, res) => {
  try {
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can delete line items' });
    }

    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM line_items WHERE id = $1 AND brand_id = $2 RETURNING id',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    res.json({ message: 'Line item deleted' });
  } catch (error) {
    console.error('Delete line item error:', error);
    res.status(500).json({ error: 'Failed to delete line item' });
  }
};

module.exports = { createLineItem, getLineItems, updateLineItem, deleteLineItem };
