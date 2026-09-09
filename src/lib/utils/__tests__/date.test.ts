import {
  todayYMD,
  toJP,
  daysBetween,
  isDateInRange,
  addDays,
  addMonths,
  formatRelativeTime,
  isValidDate
} from '../date'

describe('Date Utils', () => {
  describe('todayYMD', () => {
    it('should return today date in YYYY-MM-DD format', () => {
      const result = todayYMD()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      // Should be today's date
      const today = new Date().toISOString().slice(0, 10)
      expect(result).toBe(today)
    })
  })

  describe('toJP', () => {
    it('should format date string to Japanese format', () => {
      expect(toJP('2025-09-05')).toBe('2025/09/05')
      expect(toJP('2025-12-25')).toBe('2025/12/25')
      expect(toJP('2025-01-01')).toBe('2025/01/01')
    })

    it('should handle different date formats', () => {
      expect(toJP('2025-09-05T10:30:00Z')).toBe('2025/09/05')
    })
  })

  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      expect(daysBetween('2025-09-01', '2025-09-05')).toBe(4)
      expect(daysBetween('2025-09-05', '2025-09-01')).toBe(-4)
      expect(daysBetween('2025-09-05', '2025-09-05')).toBe(0)
    })

    it('should handle Date objects', () => {
      const start = new Date('2025-09-01')
      const end = new Date('2025-09-10')
      expect(daysBetween(start, end)).toBe(9)
    })

    it('should handle cross-month calculations', () => {
      expect(daysBetween('2025-08-28', '2025-09-03')).toBe(6)
    })

    it('should handle cross-year calculations', () => {
      expect(daysBetween('2024-12-28', '2025-01-03')).toBe(6)
    })
  })

  describe('isDateInRange', () => {
    it('should return true for dates within range', () => {
      expect(isDateInRange('2025-09-05', '2025-09-01', '2025-09-10')).toBe(true)
      expect(isDateInRange('2025-09-01', '2025-09-01', '2025-09-10')).toBe(true) // Boundary
      expect(isDateInRange('2025-09-10', '2025-09-01', '2025-09-10')).toBe(true) // Boundary
    })

    it('should return false for dates outside range', () => {
      expect(isDateInRange('2025-08-31', '2025-09-01', '2025-09-10')).toBe(false)
      expect(isDateInRange('2025-09-11', '2025-09-01', '2025-09-10')).toBe(false)
    })

    it('should handle Date objects', () => {
      const target = new Date('2025-09-05')
      const start = new Date('2025-09-01')
      const end = new Date('2025-09-10')
      expect(isDateInRange(target, start, end)).toBe(true)
    })
  })

  describe('addDays', () => {
    it('should add days to a date', () => {
      const result = addDays('2025-09-05', 5)
      expect(result.toISOString().slice(0, 10)).toBe('2025-09-10')
    })

    it('should handle negative days', () => {
      const result = addDays('2025-09-10', -5)
      expect(result.toISOString().slice(0, 10)).toBe('2025-09-05')
    })

    it('should handle cross-month boundaries', () => {
      const result = addDays('2025-08-28', 5)
      expect(result.toISOString().slice(0, 10)).toBe('2025-09-02')
    })

    it('should handle Date objects', () => {
      const date = new Date('2025-09-05')
      const result = addDays(date, 3)
      expect(result.toISOString().slice(0, 10)).toBe('2025-09-08')
    })
  })

  describe('addMonths', () => {
    it('should add months to a date', () => {
      const result = addMonths('2025-09-05', 2)
      expect(result.toISOString().slice(0, 10)).toBe('2025-11-05')
    })

    it('should handle negative months', () => {
      const result = addMonths('2025-09-05', -2)
      expect(result.toISOString().slice(0, 10)).toBe('2025-07-05')
    })

    it('should handle cross-year boundaries', () => {
      const result = addMonths('2025-09-05', 5)
      expect(result.toISOString().slice(0, 10)).toBe('2026-02-05')
    })

    it('should handle Date objects', () => {
      const date = new Date('2025-09-05')
      const result = addMonths(date, 1)
      expect(result.toISOString().slice(0, 10)).toBe('2025-10-05')
    })

    it('should handle end-of-month edge cases', () => {
      // January 31 + 1 month should become March 3rd (JavaScript standard behavior)
      const result = addMonths('2025-01-31', 1)
      expect(result.getMonth()).toBe(2) // March (0-indexed) - JavaScript auto-adjusts
      expect(result.getDate()).toBe(3) // March 3rd
    })
  })

  describe('formatRelativeTime', () => {
    const referenceDate = new Date('2025-09-15T12:00:00Z')

    it('should format today correctly', () => {
      expect(formatRelativeTime('2025-09-15', referenceDate)).toBe('today')
    })

    it('should format yesterday correctly', () => {
      expect(formatRelativeTime('2025-09-14', referenceDate)).toBe('yesterday')
    })

    it('should format recent days correctly', () => {
      expect(formatRelativeTime('2025-09-13', referenceDate)).toBe('2 days ago')
      expect(formatRelativeTime('2025-09-10', referenceDate)).toBe('5 days ago')
    })

    it('should format weeks correctly', () => {
      expect(formatRelativeTime('2025-09-08', referenceDate)).toBe('1 weeks ago')
      expect(formatRelativeTime('2025-09-01', referenceDate)).toBe('2 weeks ago')
    })

    it('should format months correctly', () => {
      expect(formatRelativeTime('2025-08-15', referenceDate)).toBe('1 months ago')
      expect(formatRelativeTime('2025-07-15', referenceDate)).toBe('2 months ago')
    })

    it('should format years correctly', () => {
      expect(formatRelativeTime('2024-09-15', referenceDate)).toBe('1 years ago')
      expect(formatRelativeTime('2023-09-15', referenceDate)).toBe('2 years ago')
    })

    it('should use current time as default reference', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const result = formatRelativeTime(yesterday.toISOString())
      expect(result).toBe('yesterday')
    })

    it('should handle Date objects', () => {
      const pastDate = new Date('2025-09-14')
      expect(formatRelativeTime(pastDate, referenceDate)).toBe('yesterday')
    })
  })

  describe('isValidDate', () => {
    it('should return true for valid date strings', () => {
      expect(isValidDate('2025-09-05')).toBe(true)
      expect(isValidDate('2025-12-31')).toBe(true)
      expect(isValidDate('2025-01-01T00:00:00Z')).toBe(true)
    })

    it('should return false for invalid date strings', () => {
      expect(isValidDate('invalid-date')).toBe(false)
      expect(isValidDate('2025-13-01')).toBe(false) // Invalid month
      expect(isValidDate('2025-02-30')).toBe(false) // Invalid day for February
      expect(isValidDate('')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidDate('2025-02-29')).toBe(false) // 2025 is not a leap year
      expect(isValidDate('2024-02-29')).toBe(true)  // 2024 is a leap year
    })
  })
})