import React, { useState } from 'react';
import { lineItemAPI } from '../services/api';
import './LineItemModal.css';

const CATEGORIES = [
  { value: 'commission', label: 'Commission' },
  { value: 'reimbursement', label: 'Reimbursement' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

// Add or edit a single line item. `ambassadors` is [{ id, name }].
// When `lineItem` is provided the modal is in edit mode (ambassador is fixed).
const LineItemModal = ({ ambassadors, defaultAmbassadorId, lineItem, onClose, onSaved }) => {
  const isEdit = !!lineItem;

  const [form, setForm] = useState({
    ambassadorId: lineItem ? String(lineItem.ambassador_id) : (defaultAmbassadorId ? String(defaultAmbassadorId) : ''),
    itemDate: lineItem ? String(lineItem.item_date).split('T')[0] : todayStr(),
    category: lineItem ? lineItem.category : 'commission',
    description: lineItem ? (lineItem.description || '') : '',
    amount: lineItem ? String(lineItem.amount) : '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && !form.ambassadorId) {
      setError('Please choose an ambassador.');
      return;
    }
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    const year = parseInt(form.itemDate.split('-')[0], 10);
    if (!form.itemDate || year < 2000 || year > 2100) {
      setError('Please enter a valid date.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await lineItemAPI.updateLineItem(lineItem.id, {
          itemDate: form.itemDate,
          category: form.category,
          description: form.description.trim(),
          amount,
        });
      } else {
        await lineItemAPI.createLineItem({
          ambassadorId: Number(form.ambassadorId),
          itemDate: form.itemDate,
          category: form.category,
          description: form.description.trim(),
          amount,
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="lineitem-modal" onClick={onClose}>
      <div className="lineitem-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="lineitem-modal-header">
          <h2>{isEdit ? 'Edit line item' : 'Add line item'}</h2>
          <button className="lineitem-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="lineitem-form">
          {!isEdit && (
            <div className="form-group">
              <label htmlFor="li-amb">Ambassador *</label>
              <select id="li-amb" value={form.ambassadorId} onChange={set('ambassadorId')}>
                <option value="">Select an ambassador…</option>
                {ambassadors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="li-date">Date *</label>
              <input
                type="date"
                id="li-date"
                value={form.itemDate}
                onChange={set('itemDate')}
                min="2000-01-01"
                max="2100-12-31"
              />
            </div>
            <div className="form-group">
              <label htmlFor="li-cat">Category *</label>
              <select id="li-cat" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="li-amount">Amount (USD) *</label>
            <input
              type="number"
              id="li-amount"
              value={form.amount}
              onChange={set('amount')}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="li-desc">Description</label>
            <input
              type="text"
              id="li-desc"
              value={form.description}
              onChange={set('description')}
              placeholder="e.g. Ice for the ice bucket"
              maxLength={200}
            />
          </div>

          {error && <div className="lineitem-error">{error}</div>}

          <div className="lineitem-actions">
            <button type="button" className="lineitem-btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="lineitem-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add line item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LineItemModal;
