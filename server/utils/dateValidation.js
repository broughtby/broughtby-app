// Guard against implausible event-date years (e.g. a typo like 202026 for 2026).
// Postgres DATE and JS Date both happily accept absurd years, and such rows then
// silently drop out of any month/year-filtered view (e.g. the Hours dashboard),
// so we bound the year at every write path.
const MIN_EVENT_YEAR = 2000;
const MAX_EVENT_YEAR = 2100;

// Returns an error message string if the value's year is out of range or the
// value is unparseable; otherwise null. Accepts a "YYYY-MM-DD" string, an ISO
// timestamp, or a Date. An empty/undefined value is treated as "nothing to
// validate" (callers decide whether the field is required).
const eventDateYearError = (value) => {
  if (value === null || value === undefined || value === '') return null;

  let year;
  if (value instanceof Date) {
    year = value.getUTCFullYear();
  } else {
    const str = String(value).trim();
    // Pull the leading year digits (before the first "-"), tolerating a sign.
    const match = str.match(/^[+-]?(\d+)-/);
    if (match) {
      year = parseInt(match[1], 10);
    } else {
      const parsed = new Date(str);
      if (isNaN(parsed.getTime())) return 'Please enter a valid event date';
      year = parsed.getUTCFullYear();
    }
  }

  if (!Number.isFinite(year) || year < MIN_EVENT_YEAR || year > MAX_EVENT_YEAR) {
    return 'Please enter a valid event date';
  }
  return null;
};

module.exports = { eventDateYearError, MIN_EVENT_YEAR, MAX_EVENT_YEAR };
