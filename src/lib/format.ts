export function fmtPrice(n: number, digits = 2) {
  const fixed = n.toFixed(digits);
  const [intPart, dec] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${withCommas}.${dec}` : withCommas;
}

export function fmtR(n: number | null) {
  if (n === null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}R`;
}

export function fmtPct(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}