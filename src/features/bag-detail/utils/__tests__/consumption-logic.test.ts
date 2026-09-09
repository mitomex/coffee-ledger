import {
  createQuickConsumeLog,
  createDetailedConsumeLog,
  consumeFromBag,
  addConsumeLogToBag
} from '../consumption-logic'
import { mockBag } from '../../../../__tests__/utils/mock-data'

describe('Consumption Logic', () => {
  const today = new Date().toISOString().split('T')[0]

  describe('createQuickConsumeLog', () => {
    it('should create a quick consume log with current date', () => {
      const dose = 14
      const log = createQuickConsumeLog(dose)

      expect(log.grams).toBe(14)
      expect(log.reducesStock).toBe(true)
      expect(log.date).toBe(today)
      expect(log.id).toMatch(/^c\d+-[a-z0-9]+$/)
    })

    it('should create unique IDs for different logs', () => {
      const log1 = createQuickConsumeLog(14)
      const log2 = createQuickConsumeLog(14)

      expect(log1.id).not.toBe(log2.id)
    })
  })

  describe('createDetailedConsumeLog', () => {
    it('should create detailed consume log with all parameters', () => {
      const log = createDetailedConsumeLog(18, '中挽き', 92, 250, 'Great extraction', false)

      expect(log.grams).toBe(18)
      expect(log.grindSize).toBe('中挽き')
      expect(log.waterTemp).toBe(92)
      expect(log.waterAmount).toBe(250)
      expect(log.notes).toBe('Great extraction')
      expect(log.reducesStock).toBe(false)
      expect(log.date).toBe(today)
    })

    it('should handle optional parameters correctly', () => {
      const log = createDetailedConsumeLog(15)

      expect(log.grams).toBe(15)
      expect(log.grindSize).toBeUndefined()
      expect(log.waterTemp).toBeUndefined()
      expect(log.waterAmount).toBeUndefined()
      expect(log.notes).toBeUndefined()
      expect(log.reducesStock).toBe(true) // default value
    })

    it('should set undefined for empty string parameters', () => {
      const log = createDetailedConsumeLog(20, '', 0, 0, '')

      expect(log.grindSize).toBeUndefined()
      expect(log.waterTemp).toBeUndefined()
      expect(log.waterAmount).toBeUndefined()
      expect(log.notes).toBeUndefined()
    })
  })

  describe('consumeFromBag', () => {
    it('should reduce remaining grams and add consume log', () => {
      const originalRemaining = mockBag.remaining_g
      const dose = 14

      const result = consumeFromBag(mockBag, dose)

      expect(result.remaining_g).toBe(originalRemaining - dose)
      expect(result.consumeLogs).toHaveLength(mockBag.consumeLogs.length + 1)
      expect(result.consumeLogs[result.consumeLogs.length - 1].grams).toBe(dose)
    })

    it('should not go below 0 grams remaining', () => {
      const smallBag = { ...mockBag, remaining_g: 5 }
      const largeDose = 20

      const result = consumeFromBag(smallBag, largeDose)

      expect(result.remaining_g).toBe(0)
    })

    it('should not reduce stock when reduceStock is false', () => {
      const originalRemaining = mockBag.remaining_g
      const dose = 14

      const result = consumeFromBag(mockBag, dose, false)

      expect(result.remaining_g).toBe(originalRemaining)
      expect(result.consumeLogs).toHaveLength(mockBag.consumeLogs.length + 1)
    })
  })

  describe('addConsumeLogToBag', () => {
    it('should add consume log and reduce stock accordingly', () => {
      const log = createDetailedConsumeLog(16, '細挽き', 95, 240, 'Perfect cup', true)
      const originalRemaining = mockBag.remaining_g

      const result = addConsumeLogToBag(mockBag, log, true)

      expect(result.remaining_g).toBe(originalRemaining - 16)
      expect(result.consumeLogs).toContain(log)
    })

    it('should not reduce stock when reduceStock is false', () => {
      const log = createDetailedConsumeLog(12, undefined, undefined, undefined, undefined, false)
      const originalRemaining = mockBag.remaining_g

      const result = addConsumeLogToBag(mockBag, log, false)

      expect(result.remaining_g).toBe(originalRemaining)
      expect(result.consumeLogs).toContain(log)
    })
  })
})