import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';
import './Hours.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Parse a date/timestamp string as a local date (avoids UTC day-shifting)
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const dateOnly = dateString.split('T')[0];
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

const fmtHours = (n) => {
  const num = Number(n) || 0;
  // Show up to 2 decimals, trim trailing zeros (e.g. 4, 4.5, 4.25)
  return num.toFixed(2).replace(/\.?0+$/, '');
};

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const Hours = () => {
  const { isBrand } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const res = await bookingAPI.getBookings();
      setBookings(res.data.bookings || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load hours. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const personId = useCallback(
    (b) => (groupByAmbassador ? b.ambassador_id : b.brand_id),
    [groupByAmbassador]
  );
  const personName = useCallback(
    (b) =>
      groupByAmbassador
        ? b.ambassador_name || 'Unknown ambassador'
        : b.company_name || b.brand_name || 'Unknown brand',
    [groupByAmbassador]
  );

  // Bookings that fall within the selected month, excluding drafts/cancelled
  const monthBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const d = parseLocalDate(b.event_date);
        return d && d.getFullYear() === year && d.getMonth() === month;
      })
      .filter((b) => b.status !== 'draft' && b.status !== 'cancelled')
      .filter((b) => personFilter === 'all' || String(personId(b)) === String(personFilter))
      .sort((a, b) => parseLocalDate(a.event_date) - parseLocalDate(b.event_date));
  }, [bookings, year, month, personFilter, personId]);

  // People who have any bookings in the selected month (for the filter dropdown)
  const peopleInMonth = useMemo(() => {
    const map = new Map();
    bookings
      .filter((b) => {
        const d = parseLocalDate(b.event_date);
        return (
          d &&
          d.getFullYear() === year &&
          d.getMonth() === month &&
          b.status !== 'draft' &&
          b.status !== 'cancelled'
        );
      })
      .forEach((b) => {
        if (!map.has(personId(b))) map.set(personId(b), personName(b));
      });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [bookings, year, month, personId, personName]);

  // Worked hours = actual (checked in/out). Falls back to scheduled duration if not logged yet.
  const workedHours = (b) => (b.actual_hours != null ? Number(b.actual_hours) : null);
  const scheduledHours = (b) => Number(b.duration) || 0;

  // Per-person aggregates for the selected month
  const perPerson = useMemo(() => {
    const map = new Map();
    monthBookings.forEach((b) => {
      const id = personId(b);
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: personName(b),
          sessions: 0,
          worked: 0,
          scheduled: 0,
          hasUnlogged: false,
          cost: 0,
        });
      }
      const row = map.get(id);
      row.sessions += 1;
      row.scheduled += scheduledHours(b);
      const w = workedHours(b);
      if (w != null) {
        row.worked += w;
      } else {
        row.hasUnlogged = true;
      }
      row.cost += Number(b.total_cost) || 0;
    });
    return Array.from(map.values()).sort((a, b) => b.worked - a.worked || b.scheduled - a.scheduled);
  }, [monthBookings, personId, personName]);

  const totals = useMemo(() => {
    return monthBookings.reduce(
      (acc, b) => {
        acc.sessions += 1;
        acc.scheduled += scheduledHours(b);
        const w = workedHours(b);
        if (w != null) acc.worked += w;
        else acc.unlogged += 1;
        acc.cost += Number(b.total_cost) || 0;
        return acc;
      },
      { sessions: 0, scheduled: 0, worked: 0, unlogged: 0, cost: 0 }
    );
  }, [monthBookings]);

  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
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

  if (loading) {
    return (
      <div className="hours-container">
        <div className="container">
          <div className="hours-loading">Loading hours…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hours-container">
      <div className="container">
        <div className="hours-header">
          <div>
            <h1 className="hours-title">Hours Worked</h1>
            <p className="hours-subtitle">
              {groupByAmbassador
                ? 'Hours logged by each ambassador you booked.'
                : 'Your logged hours by brand.'}
            </p>
          </div>
          <div className="hours-month-nav">
            <button className="month-arrow" onClick={() => changeMonth(-1)} aria-label="Previous month">
              ‹
            </button>
            <span className="month-label">
              {MONTH_NAMES[month]} {year}
            </span>
            <button className="month-arrow" onClick={() => changeMonth(1)} aria-label="Next month">
              ›
            </button>
            <button className="month-today" onClick={goToday}>
              Today
            </button>
          </div>
        </div>

        {error && <div className="hours-error">{error}</div>}

        {/* Person filter */}
        {peopleInMonth.length > 0 && (
          <div className="hours-filter">
            <label htmlFor="person-filter">
              {groupByAmbassador ? 'Ambassador' : 'Brand'}:
            </label>
            <select
              id="person-filter"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
            >
              <option value="all">Everyone ({peopleInMonth.length})</option>
              {peopleInMonth.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Summary tiles */}
        <div className="hours-tiles">
          <div className="hours-tile primary">
            <div className="tile-value">{fmtHours(totals.worked)}</div>
            <div className="tile-label">Hours worked</div>
          </div>
          <div className="hours-tile">
            <div className="tile-value">{fmtHours(totals.scheduled)}</div>
            <div className="tile-label">Hours scheduled</div>
          </div>
          <div className="hours-tile">
            <div className="tile-value">{totals.sessions}</div>
            <div className="tile-label">Sessions</div>
          </div>
          <div className="hours-tile">
            <div className="tile-value">{fmtMoney(totals.cost)}</div>
            <div className="tile-label">Total value</div>
          </div>
        </div>

        {totals.unlogged > 0 && (
          <div className="hours-note">
            {totals.unlogged} session{totals.unlogged > 1 ? 's' : ''} in this month{' '}
            {totals.unlogged > 1 ? 'have' : 'has'} no checked-out time yet — those show scheduled
            hours only.
          </div>
        )}

        {monthBookings.length === 0 ? (
          <div className="hours-empty">
            No hours recorded for {MONTH_NAMES[month]} {year}.
          </div>
        ) : (
          <>
            {/* Per-person breakdown (only when viewing everyone) */}
            {personFilter === 'all' && perPerson.length > 1 && (
              <div className="hours-section">
                <h2 className="section-title">By {groupByAmbassador ? 'ambassador' : 'brand'}</h2>
                <div className="person-grid">
                  {perPerson.map((p) => (
                    <button
                      key={p.id}
                      className="person-card"
                      onClick={() => setPersonFilter(String(p.id))}
                    >
                      <div className="person-name">{p.name}</div>
                      <div className="person-hours">
                        {fmtHours(p.worked)}
                        <span className="person-hours-unit">hrs worked</span>
                      </div>
                      <div className="person-meta">
                        {p.sessions} session{p.sessions > 1 ? 's' : ''} · {fmtHours(p.scheduled)} scheduled
                        {p.hasUnlogged ? ' *' : ''}
                      </div>
                      <div className="person-cost">{fmtMoney(p.cost)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed session table */}
            <div className="hours-section">
              <h2 className="section-title">Sessions</h2>
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
                      const d = parseLocalDate(b.event_date);
                      return (
                        <tr key={b.id}>
                          <td>
                            {d
                              ? d.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td>{personName(b)}</td>
                          <td>{b.event_name}</td>
                          <td className="nowrap">
                            {formatTime(b.start_time)} – {formatTime(b.end_time)}
                          </td>
                          <td className="num">{fmtHours(scheduledHours(b))}</td>
                          <td className="num">
                            {w != null ? (
                              <strong>{fmtHours(w)}</strong>
                            ) : (
                              <span className="pending-hours" title="Not checked out yet">
                                —
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill status-${b.status}`}>
                              {statusLabel(b)}
                            </span>
                          </td>
                          <td className="num">{fmtMoney(b.total_cost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>Total</td>
                      <td className="num">{fmtHours(totals.scheduled)}</td>
                      <td className="num">
                        <strong>{fmtHours(totals.worked)}</strong>
                      </td>
                      <td />
                      <td className="num">{fmtMoney(totals.cost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Hours;
