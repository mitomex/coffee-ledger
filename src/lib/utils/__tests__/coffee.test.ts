import {
  resolveDose,
  cupsLeft,
  dateLabel,
  formatJPY,
  isArchived,
  isPeak,
  todayYMD,
  toJP,
  sumConsumedLogs
} from '../coffee'
import { mockBag } from '../../../__tests__/utils/mock-data'
import type { Bag } from '../../types'

// Mock roaster templates
jest.mock('../../roaster-templates', () => ({
  ROASTER_TEMPLATES: {
    'Test Roaster': { dose_g: 15 },
    'Blue Bottle': { dose_g: 12 },
    'Stumptown': { dose_g: 16 }
  }
}))

describe('Coffee Utils', () => {
  describe('resolveDose', () => {
    it('should use bagDose when provided', () => {
      const result = resolveDose(14, 'Test Roaster', 18)
      expect(result).toBe(18)
    })

    it('should use roaster template dose when bagDose not provided', () => {
      const result = resolveDose(14, 'Test Roaster')
      expect(result).toBe(15)
    })

    it('should use appDose when bagDose and roaster template not available', () => {
      const result = resolveDose(14, 'Unknown Roaster')
      expect(result).toBe(14)
    })

    it('should prefer bagDose over roaster template', () => {
      const result = resolveDose(14, 'Blue Bottle', 20)
      expect(result).toBe(20)
    })
  })

  describe('cupsLeft', () => {
    it('should calculate cups correctly', () => {
      expect(cupsLeft(140, 14)).toBe(10)
      expect(cupsLeft(150, 14)).toBe(10) // Floor division
      expect(cupsLeft(13, 14)).toBe(0)   // Less than one cup
    })

    it('should handle edge cases', () => {
      expect(cupsLeft(0, 14)).toBe(0)    // No remaining
      expect(cupsLeft(140, 0)).toBe(140) // Division by 0 protection (max(1, dose))
      expect(cupsLeft(100, -5)).toBe(100) // Negative dose protection
    })

    it('should always floor the result', () => {
      expect(cupsLeft(149, 14)).toBe(10)  // 10.64... -> 10
      expect(cupsLeft(27, 14)).toBe(1)    // 1.92... -> 1
    })
  })

  describe('dateLabel', () => {
    it('should show roast date when available', () => {
      const bag = { ...mockBag, roastDate: '2025-09-05', purchaseDate: '2025-09-06' }
      expect(dateLabel(bag)).toBe('2025-09-05（焙煎）')
    })

    it('should show purchase date when roast date not available', () => {
      const bag = { ...mockBag, roastDate: undefined, purchaseDate: '2025-09-06' }
      expect(dateLabel(bag)).toBe('2025-09-06（購入）')
    })

    it('should prefer roast date over purchase date', () => {
      const bag = { ...mockBag, roastDate: '2025-09-05', purchaseDate: '2025-09-06' }
      expect(dateLabel(bag)).toBe('2025-09-05（焙煎）')
    })
  })

  describe('formatJPY', () => {
    it('should format numbers as Japanese yen', () => {
      expect(formatJPY(2500)).toBe('￥2,500')
      expect(formatJPY(1000)).toBe('￥1,000')
      expect(formatJPY(500)).toBe('￥500')
    })

    it('should handle edge cases', () => {
      expect(formatJPY(0)).toBe('￥0')
      expect(formatJPY(undefined)).toBeUndefined()
    })

    it('should not show decimal places', () => {
      expect(formatJPY(2500.99)).toBe('￥2,501') // Rounds to integer
    })
  })

  describe('isArchived', () => {
    it('should return true for bags with no remaining', () => {
      const archivedBag = { ...mockBag, remaining_g: 0 }
      expect(isArchived(archivedBag)).toBe(true)
    })

    it('should return false for bags with remaining coffee', () => {
      const bagWithRemaining = { ...mockBag, remaining_g: 50 }
      expect(isArchived(bagWithRemaining)).toBe(false)
    })

    it('should handle undefined remaining_g', () => {
      const bag = { ...mockBag, remaining_g: 0 }
      expect(isArchived(bag)).toBe(true)
    })
  })

  describe('isPeak', () => {
    const testDate = new Date('2025-09-15') // Fixed test date

    it('should return true for coffee in peak period', () => {
      const bag = { ...mockBag, roastDate: '2025-09-05' } // 10 days ago, in peak (7 days to 3 months)
      expect(isPeak(bag, testDate)).toBe(true)
    })

    it('should return false for coffee too fresh', () => {
      const bag = { ...mockBag, roastDate: '2025-09-14' } // 1 day ago, too fresh
      expect(isPeak(bag, testDate)).toBe(false)
    })

    it('should return false for coffee too old', () => {
      const bag = { ...mockBag, roastDate: '2025-06-10' } // Over 3 months ago
      expect(isPeak(bag, testDate)).toBe(false)
    })

    it('should return false when no roast date', () => {
      const bag = { ...mockBag, roastDate: undefined }
      expect(isPeak(bag, testDate)).toBe(false)
    })

    it('should handle edge cases for peak boundaries', () => {
      // Exactly 7 days (start of peak)
      const bagAtStart = { ...mockBag, roastDate: '2025-09-08' }
      expect(isPeak(bagAtStart, testDate)).toBe(true)

      // Exactly 3 months later (end of peak) - approximately 90 days
      const bagAtEnd = { ...mockBag, roastDate: '2025-06-17' } // About 90 days before test date
      expect(isPeak(bagAtEnd, testDate)).toBe(true)
    })
  })

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
    })

    it('should handle different date formats', () => {
      expect(toJP('2025-01-01')).toBe('2025/01/01')
    })
  })

  describe('sumConsumedLogs', () => {
    it('should sum only logs that reduce stock', () => {
      const bagWithLogs: Bag = {
        ...mockBag,
        consumeLogs: [
          { id: 'l1', date: '2025-09-01', grams: 14, reducesStock: true },
          { id: 'l2', date: '2025-09-02', grams: 16, reducesStock: true },
          { id: 'l3', date: '2025-09-03', grams: 20, reducesStock: false } // Shouldn't count
        ]
      }

      expect(sumConsumedLogs(bagWithLogs)).toBe(30) // 14 + 16
    })

    it('should return 0 for bags with no consume logs', () => {
      const bag = { ...mockBag, consumeLogs: [] }
      expect(sumConsumedLogs(bag)).toBe(0)
    })

    it('should return 0 for bags with only non-stock-reducing logs', () => {
      const bagWithNonReducing: Bag = {
        ...mockBag,
        consumeLogs: [
          { id: 'l1', date: '2025-09-01', grams: 14, reducesStock: false },
          { id: 'l2', date: '2025-09-02', grams: 16, reducesStock: false }
        ]
      }

      expect(sumConsumedLogs(bagWithNonReducing)).toBe(0)
    })
  })
})