import { calculateRemainingCups, calculateDailyConsumption, calculateDaysUntilEmpty } from '../coffee-calculations'
import { mockConsumeLog } from '../../../__tests__/utils/mock-data'

describe('Coffee Calculations', () => {
  describe('calculateRemainingCups', () => {
    it('should calculate remaining cups correctly with default dose', () => {
      // RED: Write test first (it will fail because function doesn't exist yet)
      const result = calculateRemainingCups(140, 14) // 140g remaining, 14g per cup
      expect(result).toBe(10)
    })

    it('should handle fractional cups by rounding down', () => {
      const result = calculateRemainingCups(150, 14) // 150 / 14 = 10.71...
      expect(result).toBe(10) // Should round down to 10 complete cups
    })

    it('should return 0 when remaining grams is 0', () => {
      const result = calculateRemainingCups(0, 14)
      expect(result).toBe(0)
    })

    it('should return 0 when remaining grams is less than dose', () => {
      const result = calculateRemainingCups(10, 14) // Not enough for a full cup
      expect(result).toBe(0)
    })

    it('should handle edge case when dose is 0', () => {
      const result = calculateRemainingCups(100, 0)
      expect(result).toBe(0) // Cannot divide by 0, should return 0
    })
  })

  describe('calculateDailyConsumption', () => {
    it('should calculate average daily consumption from consume logs', () => {
      const logs = [
        { ...mockConsumeLog, date: '2025-09-01', grams: 14, reducesStock: true },
        { ...mockConsumeLog, date: '2025-09-02', grams: 28, reducesStock: true }, // 2 cups
        { ...mockConsumeLog, date: '2025-09-03', grams: 14, reducesStock: true },
        { ...mockConsumeLog, date: '2025-09-04', grams: 0, reducesStock: false }, // Doesn't reduce stock
      ]
      
      // Total: 56g over 4 days, but only 3 days had actual consumption
      const result = calculateDailyConsumption(logs, 4)
      expect(result).toBeCloseTo(14, 1) // 56g / 4 days = 14g per day
    })

    it('should return 0 when no logs provided', () => {
      const result = calculateDailyConsumption([], 7)
      expect(result).toBe(0)
    })

    it('should only count logs that reduce stock', () => {
      const logs = [
        { ...mockConsumeLog, date: '2025-09-01', grams: 14, reducesStock: true },
        { ...mockConsumeLog, date: '2025-09-02', grams: 100, reducesStock: false }, // Shouldn't count
      ]
      
      const result = calculateDailyConsumption(logs, 2)
      expect(result).toBe(7) // 14g / 2 days = 7g per day
    })
  })

  describe('calculateDaysUntilEmpty', () => {
    it('should calculate days until empty based on daily consumption', () => {
      const remainingGrams = 140
      const dailyConsumption = 14
      
      const result = calculateDaysUntilEmpty(remainingGrams, dailyConsumption)
      expect(result).toBe(10) // 140g / 14g per day = 10 days
    })

    it('should handle fractional days by rounding down', () => {
      const remainingGrams = 150
      const dailyConsumption = 14
      
      const result = calculateDaysUntilEmpty(remainingGrams, dailyConsumption)
      expect(result).toBe(10) // 150 / 14 = 10.71..., rounds down to 10
    })

    it('should return 0 when no grams remaining', () => {
      const result = calculateDaysUntilEmpty(0, 14)
      expect(result).toBe(0)
    })

    it('should return Infinity when daily consumption is 0', () => {
      const result = calculateDaysUntilEmpty(100, 0)
      expect(result).toBe(Infinity)
    })

    it('should return 0 when daily consumption is negative', () => {
      const result = calculateDaysUntilEmpty(100, -5)
      expect(result).toBe(0) // Invalid input, should return 0
    })
  })
})