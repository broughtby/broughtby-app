import React, { useState } from 'react';
import { internalHoursAPI } from '../services/api';
import './LineItemModal.css';

const todayStr = () => new Date().toISOString().split('T')[0];

// Add or edit a single internal-hours entry for a free-text named person.
const InternalHoursModal = ({ entry, onClose, onSaved }) => {
  const isEdit = !!entry;

  const [form, setForm] = useState({
    personName: entry ? entry.person_name : '',
    workDate: entry ? String(entry.work_date).split('T')[0] : todayStr(),
    hours: entry ? String(entry.hours) : '',
    amount: entry ? String(entry.amount) : '',
    description: entry ? (entry.description || '') : '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.personName.trim()) {
      setError('Please enter a name.');
      return;
    }
    const hours = parseFloat(form.hours);
    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Enter hours greater than zero.');
      return;
    }
    const amount = form.amount === '' ? 0 : parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Amount cannot be negative.');
      return;
    }
    const year = parseInt(form.workDate.split('-')[0], 10);
    if (!form.workDate || year < 2000 || year > 2100) {
      setError('Please enter a valid date.');
      return;
    }

    setSaving(true);
    const payload = {
      personName: form.personName.trim(),
      workDate: form.workDate,
      hours,
      amount,
      description: form.description.trim(),
    };
    try {
      if (isEdit) {
        await internalHoursAPI.updateInternalHours(entry.id, payload);
      } else {
        await internalHoursAPI.createInternalHours(payload);
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
          <h2>{isEdit ? 'Edit internal hours' : 'Add internal hours'}</h2>
          <button className="lineitem-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="lineitem-form">
          <div className="form-group">
            <label htmlFor="ih-name">Name *</label>
            <input
              type="text"
              id="ih-name"
              value={form.personName}
              onChange={set('personName')}
              placeholder="e.g. Rob Burton (husband)"
              maxLength={200}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ih-date">Date *</label>
              <input
                type="date"
                id="ih-date"
                value={form.workDate}
                onChange={set('workDate')}
                min="2000-01-01"
                max="2100-12-31"
              />
            </div>
            <div className="form-group">
              <label htmlFor="ih-hours">Hours *</label>
              <input
                type="number"
                id="ih-hours"
                value={form.hours}
                onChange={set('hours')}
                min="0"
                step="0.25"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ih-amount">Pay amount (USD)</label>
            <input
              type="number"
              id="ih-amount"
              value={form.amount}
              onChange={set('amount')}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ih-desc">Description</label>
            <input
              type="text"
              id="ih-desc"
              value={form.description}
              onChange={set('description')}
              placeholder="e.g. Helped set up / tear down booth"
              maxLength={200}
            />
          </div>

          {error && <div className="lineitem-error">{error}</div>}

          <div className="lineitem-actions">
            <button type="button" className="lineitem-btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="lineitem-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InternalHoursModal;
