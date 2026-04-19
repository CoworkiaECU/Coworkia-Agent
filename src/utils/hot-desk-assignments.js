export function normalizeHotDeskNumbers(rawValue, fallbackValue = null) {
  const numbers = [];

  const collect = (value) => {
    if (value === null || value === undefined || value === '') return;

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('[')) {
        try {
          collect(JSON.parse(trimmed));
          return;
        } catch {
          // Fall through to numeric parsing.
        }
      }

      if (/^\d+(?:\s*,\s*\d+)*$/.test(trimmed)) {
        trimmed.split(',').forEach(part => collect(part.trim()));
        return;
      }

      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        collect(parsed);
      }
      return;
    }

    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      numbers.push(Math.trunc(value));
    }
  };

  collect(rawValue);
  collect(fallbackValue);

  return [...new Set(numbers)].sort((a, b) => a - b);
}

export function serializeHotDeskNumbers(rawValue, fallbackValue = null) {
  const numbers = normalizeHotDeskNumbers(rawValue, fallbackValue);
  return numbers.length ? JSON.stringify(numbers) : null;
}

export function getHotDeskNumbers(reservation = {}) {
  return normalizeHotDeskNumbers(
    reservation.hot_desk_numbers ?? reservation.hotDeskNumbers,
    reservation.hot_desk_number ?? reservation.hotDeskNumber
  );
}

export function formatHotDeskNumbers(rawValue, fallbackValue = null) {
  const numbers = normalizeHotDeskNumbers(rawValue, fallbackValue);
  return numbers.map(number => `#${number}`).join(', ');
}
