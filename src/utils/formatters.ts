/**
 * Format bytes into human-readable GB, MB, or TB
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 GB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'GB'}`;
}

/**
 * Format USD currency
 */
export function formatCurrencyUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format Toman currency
 */
export function formatCurrencyToman(amountInToman: number): string {
  return new Intl.NumberFormat('fa-IR').format(amountInToman) + ' تومان';
}

/**
 * Universal Currency Formatter for Dual-Currency Accounts (IRT / USD)
 */
export function formatCurrency(amount: number, currency: 'IRT' | 'USD' | string = 'IRT'): string {
  if (String(currency).toUpperCase() === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  }
  return `${Math.round(amount).toLocaleString()} تومان`;
}

/**
 * Returns standard unit label for display ($ or T / Toman)
 */
export function getCurrencyUnit(currency: 'IRT' | 'USD' | string = 'IRT', short: boolean = false): string {
  if (String(currency).toUpperCase() === 'USD') {
    return short ? '$' : 'USD ($)';
  }
  return short ? 'T' : 'Toman';
}

/**
 * Format ISO date string into readable date & time
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
