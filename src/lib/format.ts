export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export const fmtMonth = (d: Date) =>
  d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
export const dayOf = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric' });
