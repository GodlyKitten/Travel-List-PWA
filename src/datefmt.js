function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateFromIso(iso) {
  if (!iso) return null;
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function dayDiff(iso) {
  const target = dateFromIso(iso);
  if (!target) return null;
  const today = todayMidnight();
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function countdownLabel(iso) {
  const d = dayDiff(iso);
  if (d == null) return null;
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 0) return `in ${d} days`;
  return `${-d} days ago`;
}

export function groupForDate(iso) {
  const d = dayDiff(iso);
  if (d == null) return 'none';
  return d >= 0 ? 'upcoming' : 'past';
}
