/**
 * Utility currency formatter for Indonesian Rupiah (Rp. XXX.XXX,00)
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === null || num === undefined || isNaN(num)) {
    return 'Rp. 0,00'
  }
  
  // Format to standard IDR locale with 2 decimal places: Rp. 200.000,00
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)

  return `Rp. ${formatted}`
}

/**
 * Parse currency string like "Rp. 200.000,00" or "200.000" into raw float number
 */
export function parseRupiah(formatted: string): number {
  if (!formatted) return 0
  // Remove "Rp.", spaces, and dots (thousand separators), replace comma with dot
  const clean = formatted
    .replace(/Rp\.?/g, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}
