import React, { useState, useEffect, useCallback } from 'react';
import { internalHoursAPI } from '../services/api';
import InternalHoursModal from './InternalHoursModal';
import './InternalHoursAdmin.css';

const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [y, m, d] = String(dateString).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const fmtDate = (dateStr) => {
  const d = parseLocalDate(dateStr);
  return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
};

const fmtHours = (n) => (Number(n) || 0).toFixed(2).replace(/\.?0+$/, '');
const fmtMoney = (n) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const InternalHoursAdmin = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await internalHoursAPI.getInternalHours();
      setEntries(res.data.internalHours || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch internal hours:', err);
      setError('Failed to load internal hours.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (entry) => { setEditing(entry); setModalOpen(true); };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    fetchEntries();
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete ${entry.person_name}'s entry from ${fmtDate(entry.work_date)}?`)) return;
    try {
      await internalHoursAPI.deleteInternalHours(entry.id);
      fetchEntries();
    } catch (err) {
      console.error('Failed to delete internal hours:', err);
      setError('Failed to delete entry.');
    }
  };

  const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const totalPay = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div className="internal-hours-section">
      <div className="section-header">
        <div>
          <h2>Internal Hours</h2>
          <p className="ih-subtitle">
            Manually track extra hours worked by internal staff (not brand ambassadors).
          </p>
        </div>
        <button className="ih-add-btn" onClick={openAdd}>+ Add hours</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No internal hours logged yet.</div>
      ) : (
        <div className="ih-table-container">
          <table className="ih-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th className="num">Hours</th>
                <th className="num">Pay</th>
                <th>Description</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">{fmtDate(e.work_date)}</td>
                  <td><strong>{e.person_name}</strong></td>
                  <td className="num">{fmtHours(e.hours)}</td>
                  <td className="num">{fmtMoney(e.amount)}</td>
                  <td>{e.description || <span className="ih-muted">—</span>}</td>
                  <td className="num nowrap">
                    <button className="ih-link" onClick={() => openEdit(e)}>Edit</button>
                    <button className="ih-link danger" onClick={() => handleDelete(e)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total ({entries.length})</td>
                <td className="num"><strong>{fmtHours(totalHours)}</strong></td>
                <td className="num"><strong>{fmtMoney(totalPay)}</strong></td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {modalOpen && (
        <InternalHoursModal
          entry={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default InternalHoursAdmin;
