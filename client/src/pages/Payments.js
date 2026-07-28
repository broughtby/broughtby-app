import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, lineItemAPI, matchAPI, internalHoursAPI } from '../services/api';
import LineItemModal from '../components/LineItemModal';
import './Payments.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CATEGORY_LABELS = { commission: 'Commission', reimbursement: 'Reimbursement' };

// Parse a date/timestamp string as a local date (avoids UTC day-shifting)
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const dateOnly = String(dateString).split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatTime = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const shortDate = (dateStr) => {
  const d = parseLocalDate(dateStr);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
};

const fmtHours = (n) => {
  const num = Number(n) || 0;
  return num.toFixed(2).replace(/\.?0+$/, '');
};

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const Payments = () => {
  const { isBrand, isAdmin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [internalHours, setInternalHours] = useState([]);
  const [ambassadorOptions, setAmbassadorOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Default to the current month
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [personFilter, setPersonFilter] = useState('all');

  // For a brand, "someone" is an ambassador they booked; for an ambassador it's the brand.
  const groupByAmbassador = isBrand;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [bookingsRes, lineItemsRes] = await Promise.all([
        bookingAPI.getBookings(),
        lineItemAPI.getLineItems(),
      ]);
      setBookings(bookingsRes.data.bookings || []);
      setLineItems(lineItemsRes.data.lineItems || []);

      // Internal staff hours are admin-only and never shown to ambassadors
      if (isAdmin) {
        try {
          const ihRes = await internalHoursAPI.getInternalHours();
          setInternalHours(ihRes.data.internalHours || []);
        } catch {
          setInternalHours([]);
        }
      }

      // Brands need the list of connected ambassadors to add line items for
      if (isBrand) {
        try {
          const matchesRes = await matchAPI.getMatches();
          const opts = (matchesRes.data.matches || [])
            .map((m) => ({ id: m.user_id, name: m.name }))
            .filter((o) => o.id && o.name);
          setAmbassadorOptions(opts);
        } catch {
          setAmbassadorOptions([]);
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch payments data:', err);
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isBrand, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Both bookings and line items carry ambassador_id/brand_id and the matching
  // *_name columns, so one pair of helpers works for either record type.
  const personId = useCallback(
    (r) => (groupByAmbassador ? r.ambassador_id : r.brand_id),
    [groupByAmbassador]
  );
  const personName = useCallback(
    (r) =>
      groupByAmbassador
        ? r.ambassador_name || 'Unknown ambassador'
        : r.company_name || r.brand_name || 'Unknown brand',
    [groupByAmbassador]
  );

  const inSelectedMonth = useCallback(
    (dateStr) => {
      const d = parseLocalDate(dateStr);
      return d && d.getFullYear() === year && d.getMonth() === month;
    },
    [year, month]
  );

  const matchesPerson = useCallback(
    (r) => personFilter === 'all' || String(personId(r)) === String(personFilter),
    [personFilter, personId]
  );

  // Bookings in the selected month (excluding drafts/cancelled)
  const monthBookings = useMemo(() => {
    return bookings
      .filter((b) => inSelectedMonth(b.event_date))
      .filter((b) => b.status !== 'draft' && b.status !== 'cancelled')
      .filter(matchesPerson)
      .sort((a, b) => parseLocalDate(a.event_date) - parseLocalDate(b.event_date));
  }, [bookings, inSelectedMonth, matchesPerson]);

  // Line items in the selected month
  const monthLineItems = useMemo(() => {
    return lineItems
      .filter((li) => inSelectedMonth(li.item_date))
      .filter(matchesPerson)
      .sort((a, b) => parseLocalDate(a.item_date) - parseLocalDate(b.item_date));
  }, [lineItems, inSelectedMonth, matchesPerson]);

  // Internal staff hours in the selected month (admin-only; not tied to a person filter)
  const monthInternalHours = useMemo(() => {
    return internalHours
      .filter((ih) => inSelectedMonth(ih.work_date))
      .sort((a, b) => parseLocalDate(a.work_date) - parseLocalDate(b.work_date));
  }, [internalHours, inSelectedMonth]);

  const internalTotals = useMemo(() => {
    return monthInternalHours.reduce(
      (acc, ih) => {
        acc.hours += Number(ih.hours) || 0;
        acc.pay += Number(ih.amount) || 0;
        return acc;
      },
      { hours: 0, pay: 0 }
    );
  }, [monthInternalHours]);

  // People with any booking OR line item in the selected month (for the filter)
  const peopleInMonth = useMemo(() => {
    const map = new Map();
    bookings
      .filter((b) => inSelectedMonth(b.event_date) && b.status !== 'draft' && b.status !== 'cancelled')
      .forEach((b) => map.set(personId(b), personName(b)));
    lineItems
      .filter((li) => inSelectedMonth(li.item_date))
      .forEach((li) => map.set(personId(li), personName(li)));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [bookings, lineItems, inSelectedMonth, personId, personName]);

  // Worked hours = actual (checked in/out). Falls back to scheduled duration if not logged yet.
  const workedHours = (b) => (b.actual_hours != null ? Number(b.actual_hours) : null);
  const scheduledHours = (b) => Number(b.duration) || 0;

  // Pay for a session: actual worked hours × rate once the session is checked
  // out, otherwise the scheduled amount (duration × rate) from booking time.
  const bookingPay = (b) => {
    if (b.actual_hours == null) return Number(b.total_cost) || 0;
    const rate = Number(b.hourly_rate) ||
      (Number(b.duration) ? (Number(b.total_cost) || 0) / Number(b.duration) : 0);
    return Math.round(Number(b.actual_hours) * rate * 100) / 100;
  };

  // Per-person aggregates: hours + booking pay + adjustments -> total owed
  const perPerson = useMemo(() => {
    const map = new Map();
    const ensure = (id, name) => {
      if (!map.has(id)) {
        map.set(id, {
          id, name, sessions: 0, worked: 0, scheduled: 0,
          hasUnlogged: false, bookingPay: 0, adjustments: 0,
        });
      }
      return map.get(id);
    };

    monthBookings.forEach((b) => {
      const row = ensure(personId(b), personName(b));
      row.sessions += 1;
      row.scheduled += scheduledHours(b);
      const w = workedHours(b);
      if (w != null) row.worked += w;
      else row.hasUnlogged = true;
      row.bookingPay += bookingPay(b);
    });

    monthLineItems.forEach((li) => {
      const row = ensure(personId(li), personName(li));
      row.adjustments += Number(li.amount) || 0;
    });

    return Array.from(map.values())
      .map((r) => ({ ...r, totalOwed: r.bookingPay + r.adjustments }))
      .sort((a, b) => b.totalOwed - a.totalOwed);
  }, [monthBookings, monthLineItems, personId, personName]);

  const totals = useMemo(() => {
    const t = { sessions: 0, worked: 0, scheduled: 0, unlogged: 0, bookingPay: 0, adjustments: 0 };
    monthBookings.forEach((b) => {
      t.sessions += 1;
      t.scheduled += scheduledHours(b);
      const w = workedHours(b);
      if (w != null) t.worked += w;
      else t.unlogged += 1;
      t.bookingPay += bookingPay(b);
    });
    monthLineItems.forEach((li) => {
      t.adjustments += Number(li.amount) || 0;
    });
    // Internal staff pay/hours are month-wide (not tied to a person), so they
    // only fold into the totals when viewing everyone as an admin.
    const includeInternal = isAdmin && personFilter === 'all';
    t.internalPay = includeInternal ? internalTotals.pay : 0;
    t.internalHours = includeInternal ? internalTotals.hours : 0;
    t.totalOwed = t.bookingPay + t.adjustments + t.internalPay;
    return t;
  }, [monthBookings, monthLineItems, internalTotals, isAdmin, personFilter]);

  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    else if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
    setPersonFilter('all');
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setPersonFilter('all');
  };

  const statusLabel = (b) => {
    if (b.status === 'completed') return 'Completed';
    if (b.status === 'confirmed') return 'Confirmed';
    if (b.status === 'pending') return 'Pending';
    return b.status;
  };

  const openAdd = () => { setEditingItem(null); setModalOpen(true); };
  const openEdit = (item) => { setEditingItem(item); setModalOpen(true); };

  const handleSaved = () => {
    setModalOpen(false);
    setEditingItem(null);
    fetchData();
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this line item?')) return;
    try {
      await lineItemAPI.deleteLineItem(item.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete line item:', err);
      setError('Failed to delete line item.');
    }
  };

  if (loading) {
    return (
      <div className="hours-container">
        <div className="container">
          <div className="hours-loading">Loading payments…</div>
        </div>
      </div>
    );
  }

  const nothingThisMonth = monthBookings.length === 0 && monthLineItems.length === 0;
  // The default ambassador for a new line item when a single person is filtered
  const defaultAmbassadorId = personFilter !== 'all' && groupByAmbassador ? personFilter : '';

  return (
    <div className="hours-container">
      <div className="container">
        <div className="hours-header">
          <div>
            <h1 className="hours-title">Payments</h1>
            <p className="hours-subtitle">
              {groupByAmbassador
                ? 'Hours, commissions and reimbursements owed to each ambassador.'
                : 'Your hours, commissions and reimbursements by brand.'}
            </p>
          </div>
          <div className="hours-month-nav">
            <button className="month-arrow" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
            <span className="month-label">{MONTH_NAMES[month]} {year}</span>
            <button className="month-arrow" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
            <button className="month-today" onClick={goToday}>Today</button>
          </div>
        </div>

        {error && <div className="hours-error">{error}</div>}

        {/* Person filter */}
        {peopleInMonth.length > 0 && (
          <div className="hours-filter">
            <label htmlFor="person-filter">{groupByAmbassador ? 'Ambassador' : 'Brand'}:</label>
            <select id="person-filter" value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
              <option value="all">Everyone ({peopleInMonth.length})</option>
              {peopleInMonth.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Summary tiles */}
        <div className="hours-tiles">
          <div className="hours-tile primary">
            <div className="tile-value">{fmtMoney(totals.totalOwed)}</div>
            <div className="tile-label">Total owed</div>
          </div>
          <div className="hours-tile">
            <div className="tile-value">{fmtHours(totals.worked + totals.internalHours)}</div>
            <div className="tile-label">Hours worked</div>
          </div>
          <div className="hours-tile">
            <div className="tile-value">{fmtMoney(totals.bookingPay)}</div>
            <div className="tile-label">Booking pay</div>
          </div>
          <div className="hours-tile">
            <div className="tile-value">{fmtMoney(totals.adjustments)}</div>
            <div className="tile-label">Adjustments</div>
          </div>
          {isAdmin && personFilter === 'all' && (
            <div className="hours-tile">
              <div className="tile-value">{fmtMoney(totals.internalPay)}</div>
              <div className="tile-label">Internal staff</div>
            </div>
          )}
        </div>

        {totals.unlogged > 0 && (
          <div className="hours-note">
            {totals.unlogged} session{totals.unlogged > 1 ? 's' : ''} in this month{' '}
            {totals.unlogged > 1 ? 'have' : 'has'} no checked-out time yet — those show scheduled hours only.
          </div>
        )}

        {/* Per-person breakdown (only when viewing everyone) */}
        {personFilter === 'all' && perPerson.length > 1 && (
          <div className="hours-section">
            <h2 className="section-title">By {groupByAmbassador ? 'ambassador' : 'brand'}</h2>
            <div className="person-grid">
              {perPerson.map((p) => (
                <button key={p.id} className="person-card" onClick={() => setPersonFilter(String(p.id))}>
                  <div className="person-name">{p.name}</div>
                  <div className="person-hours">
                    {fmtMoney(p.totalOwed)}
                    <span className="person-hours-unit">owed</span>
                  </div>
                  <div className="person-meta">
                    {fmtHours(p.worked)} hrs worked{p.hasUnlogged ? ' *' : ''}
                    {p.adjustments > 0 ? ` · ${fmtMoney(p.adjustments)} adjustments` : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sessions (hours) */}
        <div className="hours-section">
          <h2 className="section-title">Sessions</h2>
          {monthBookings.length === 0 ? (
            <div className="hours-empty">No hours recorded for {MONTH_NAMES[month]} {year}.</div>
          ) : (
            <div className="hours-table-wrap">
              <table className="hours-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{groupByAmbassador ? 'Ambassador' : 'Brand'}</th>
                    <th>Event</th>
                    <th>Time</th>
                    <th className="num">Scheduled</th>
                    <th className="num">Worked</th>
                    <th>Status</th>
                    <th className="num">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {monthBookings.map((b) => {
                    const w = workedHours(b);
                    return (
                      <tr key={b.id}>
                        <td>{shortDate(b.event_date)}</td>
                        <td>{personName(b)}</td>
                        <td>{b.event_name}</td>
                        <td className="nowrap">{formatTime(b.start_time)} – {formatTime(b.end_time)}</td>
                        <td className="num">{fmtHours(scheduledHours(b))}</td>
                        <td className="num">
                          {w != null ? <strong>{fmtHours(w)}</strong> : (
                            <span className="pending-hours" title="Not checked out yet">—</span>
                          )}
                        </td>
                        <td><span className={`status-pill status-${b.status}`}>{statusLabel(b)}</span></td>
                        <td className="num">{fmtMoney(bookingPay(b))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total</td>
                    <td className="num">{fmtHours(totals.scheduled)}</td>
                    <td className="num"><strong>{fmtHours(totals.worked)}</strong></td>
                    <td />
                    <td className="num">{fmtMoney(totals.bookingPay)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Adjustments (line items) */}
        <div className="hours-section">
          <div className="section-header">
            <h2 className="section-title">Commissions &amp; reimbursements</h2>
            {isBrand && (
              <button
                className="add-lineitem-btn"
                onClick={openAdd}
                disabled={ambassadorOptions.length === 0}
                title={ambassadorOptions.length === 0 ? 'Connect with an ambassador first' : 'Add a line item'}
              >
                + Add line item
              </button>
            )}
          </div>

          {monthLineItems.length === 0 ? (
            <div className="hours-empty">
              No commissions or reimbursements for {MONTH_NAMES[month]} {year}.
            </div>
          ) : (
            <div className="hours-table-wrap">
              <table className="hours-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{groupByAmbassador ? 'Ambassador' : 'Brand'}</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="num">Amount</th>
                    {isBrand && <th className="num">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {monthLineItems.map((li) => (
                    <tr key={li.id}>
                      <td>{shortDate(li.item_date)}</td>
                      <td>{personName(li)}</td>
                      <td>
                        <span className={`category-pill category-${li.category}`}>
                          {CATEGORY_LABELS[li.category] || li.category}
                        </span>
                      </td>
                      <td>{li.description || <span className="muted">—</span>}</td>
                      <td className="num">{fmtMoney(li.amount)}</td>
                      {isBrand && (
                        <td className="num nowrap">
                          <button className="link-btn" onClick={() => openEdit(li)}>Edit</button>
                          <button className="link-btn danger" onClick={() => handleDelete(li)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total</td>
                    <td className="num"><strong>{fmtMoney(totals.adjustments)}</strong></td>
                    {isBrand && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Internal staff hours — admin only, hidden from ambassadors */}
        {isAdmin && personFilter === 'all' && (
          <div className="hours-section">
            <div className="section-header">
              <h2 className="section-title">Internal staff hours</h2>
              <span className="ih-manage-hint">Manage in Admin</span>
            </div>
            {monthInternalHours.length === 0 ? (
              <div className="hours-empty">
                No internal hours logged for {MONTH_NAMES[month]} {year}.
              </div>
            ) : (
              <div className="hours-table-wrap">
                <table className="hours-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Name</th>
                      <th className="num">Hours</th>
                      <th className="num">Pay</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthInternalHours.map((ih) => (
                      <tr key={ih.id}>
                        <td>{shortDate(ih.work_date)}</td>
                        <td>{ih.person_name}</td>
                        <td className="num">{fmtHours(ih.hours)}</td>
                        <td className="num">{fmtMoney(ih.amount)}</td>
                        <td>{ih.description || <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Total</td>
                      <td className="num"><strong>{fmtHours(internalTotals.hours)}</strong></td>
                      <td className="num"><strong>{fmtMoney(internalTotals.pay)}</strong></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {nothingThisMonth && !isBrand && (
          <div className="hours-note">Nothing recorded for {MONTH_NAMES[month]} {year} yet.</div>
        )}
      </div>

      {modalOpen && (
        <LineItemModal
          ambassadors={ambassadorOptions}
          defaultAmbassadorId={defaultAmbassadorId}
          lineItem={editingItem}
          onClose={() => { setModalOpen(false); setEditingItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default Payments;
