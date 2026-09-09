/**
 * Get today's date in YYYY-MM-DD format
 */
export const todayYMD = (): string => {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Format date string to Japanese format (YYYY/MM/DD)
 */
export const toJP = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Calculate days between two dates
 */
export const daysBetween = (startDate: string | Date, endDate: string | Date): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a date is within a range
 */
export const isDateInRange = (
  targetDate: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean => {
  const target = new Date(targetDate)
  const start = new Date(startDate)
  const end = new Date(endDate)
  return target >= start && target <= end
}

/**
 * Add days to a date
 */
export const addDays = (date: string | Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add months to a date
 */
export const addMonths = (date: string | Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Format relative time in English (avoiding encoding issues)
 */
export const formatRelativeTime = (pastDate: string | Date, referenceDate?: Date): string => {
  const past = new Date(pastDate)
  const reference = referenceDate || new Date()
  const days = daysBetween(past, reference)

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

/**
 * Check if date string is valid
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return false
  
  // More strict validation for obviously invalid dates
  const originalString = dateString.slice(0, 10)
  
  // For invalid dates like 2025-02-30, new Date will auto-correct to 2025-03-02
  // We check if the reconstructed date matches the input
  if (originalString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = originalString.split('-').map(Number)
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day
  }
  
  return true
}