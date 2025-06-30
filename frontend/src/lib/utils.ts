// src/lib/utils.ts

/**
 * Formats a number (in cents) into a ZAR currency string (e.g., R 1 234.56).
 * @param amountInCents The amount in the smallest currency unit.
 * @returns A formatted currency string.
 */
export const formatCurrency = (amountInCents: number): string => {
  if (typeof amountInCents !== 'number') return '';
  
  const amount = (amountInCents / 100).toFixed(2);
  const parts = amount.split('.');
  // Add thousand separators to the integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `R ${parts.join('.')}`;
};