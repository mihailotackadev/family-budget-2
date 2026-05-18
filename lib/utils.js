export const CATEGORIES = [
  { id: 'food',          label: 'Food & Groceries',    icon: '🥦', color: '#16a34a' },
  { id: 'chemicals',     label: 'Cleaning',            icon: '🧴', color: '#2563eb' },
  { id: 'clothing',      label: 'Clothing',            icon: '👕', color: '#db2777' },
  { id: 'transport',     label: 'Transport',           icon: '🚗', color: '#d97706' },
  { id: 'health',        label: 'Health',              icon: '💊', color: '#059669' },
  { id: 'entertainment', label: 'Entertainment',       icon: '🎬', color: '#7c3aed' },
  { id: 'utilities',     label: 'Utilities',           icon: '⚡', color: '#ea580c' },
  { id: 'other',         label: 'Other',               icon: '📦', color: '#64748b' },
];

export const MEMBER_COLORS = [
  '#6366f1','#f472b6','#4ade80','#f59e0b',
  '#60a5fa','#a78bfa','#fb923c','#34d399',
];

export const MEMBER_EMOJIS = ['👤','👩','👨','🧑','👧','👦','🧔','👩‍🦱'];

export function formatCurrency(amount, currency = 'RSD') {
  const n = parseFloat(amount) || 0;
  return new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' ' + currency;
}

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export function getMonthName(month) {
  return new Date(2024, month - 1).toLocaleString('default', { month: 'long' });
}

export function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Hash a PIN using Web Crypto API (works in browser + Node/Edge)
export async function hashPin(pin) {
  const salt = 'fambud-2026-secure';
  const msgUint8 = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
