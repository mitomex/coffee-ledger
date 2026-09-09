import { sortBags, filterActiveBags, getBagStats, searchBags } from '../bag-sorting'
import { mockBags } from '../../../../__tests__/utils/mock-data'
import type { Bag } from '@/lib/types'

describe('Bag Sorting Utils', () => {
  const testBags: Bag[] = [
    {
      ...mockBags[0],
      id: 'bag1',
      name: 'Ethiopia Yirgacheffe',
      roaster: 'Blue Bottle',
      process: 'Washed',
      roastDate: '2025-09-01',
      purchaseDate: '2025-09-02',
      remaining_g: 150,
      bagDose_g: 15,
      variety: 'Heirloom'
    },
    {
      ...mockBags[1],
      id: 'bag2',
      name: 'Colombia Huila',
      roaster: 'Stumptown',
      process: 'Honey',
      roastDate: '2025-09-10',
      purchaseDate: '2025-09-11',
      remaining_g: 100,
      bagDose_g: 14,
      variety: 'Caturra'
    },
    {
      ...mockBags[2],
      id: 'bag3',
      name: 'Panama Geisha',
      roaster: 'Counter Culture',
      process: 'Natural',
      roastDate: '2025-08-25',
      purchaseDate: '2025-08-26',
      remaining_g: 0,
      bagDose_g: 16,
      variety: 'Geisha'
    },
    {
      ...mockBags[0],
      id: 'bag4',
      name: 'Kenya AA',
      roaster: 'Intelligentsia',
      process: 'Washed',
      roastDate: '2025-09-05',
      purchaseDate: '2025-09-06',
      remaining_g: 0,
      bagDose_g: 14,
      variety: 'SL28'
    }
  ]

  describe('sortBags', () => {
    it('should sort by date ascending', () => {
      const result = sortBags(testBags, 'date-asc', 14)
      
      expect(result[0].roastDate).toBe('2025-08-25') // Panama (oldest)
      expect(result[1].roastDate).toBe('2025-09-01') // Ethiopia
      expect(result[2].roastDate).toBe('2025-09-05') // Kenya
      expect(result[3].roastDate).toBe('2025-09-10') // Colombia (newest)
    })

    it('should sort by date descending', () => {
      const result = sortBags(testBags, 'date-desc', 14)
      
      expect(result[0].roastDate).toBe('2025-09-10') // Colombia (newest)
      expect(result[1].roastDate).toBe('2025-09-05') // Kenya
      expect(result[2].roastDate).toBe('2025-09-01') // Ethiopia
      expect(result[3].roastDate).toBe('2025-08-25') // Panama (oldest)
    })

    it('should sort by process', () => {
      const result = sortBags(testBags, 'process', 14)
      
      // Order should be: Washed → Honey → Natural → Anaerobic
      expect(result[0].process).toBe('Washed') // Ethiopia or Kenya
      expect(result[1].process).toBe('Washed') // Ethiopia or Kenya
      expect(result[2].process).toBe('Honey')  // Colombia
      expect(result[3].process).toBe('Natural') // Panama
    })

    it('should sort by remaining cups ascending', () => {
      const result = sortBags(testBags, 'remain-asc', 14)
      
      // Bag4 (Kenya): 0g / 14g = 0 cups
      // Bag3 (Panama): 0g / 16g = 0 cups  
      // Bag2 (Colombia): 100g / 14g = 7 cups
      // Bag1 (Ethiopia): 150g / 15g = 10 cups
      expect(result[0].remaining_g).toBe(0) // Kenya or Panama
      expect(result[1].remaining_g).toBe(0) // Kenya or Panama
      expect(result[2].id).toBe('bag2') // Colombia - 7 cups
      expect(result[3].id).toBe('bag1') // Ethiopia - 10 cups
    })

    it('should sort by remaining cups descending', () => {
      const result = sortBags(testBags, 'remain-desc', 14)
      
      expect(result[0].id).toBe('bag1') // Ethiopia - 10 cups
      expect(result[1].id).toBe('bag2') // Colombia - 7 cups
      expect(result[2].remaining_g).toBe(0) // Kenya or Panama
      expect(result[3].remaining_g).toBe(0) // Kenya or Panama
    })

    it('should use purchase date when roast date not available', () => {
      const bagsWithoutRoast = testBags.map(bag => ({
        ...bag,
        roastDate: undefined
      }))
      
      const result = sortBags(bagsWithoutRoast, 'date-asc', 14)
      
      expect(result[0].purchaseDate).toBe('2025-08-26') // Panama (oldest purchase)
      expect(result[3].purchaseDate).toBe('2025-09-11') // Colombia (newest purchase)
    })

    it('should not modify original array', () => {
      const originalOrder = testBags.map(b => b.id)
      sortBags(testBags, 'date-desc', 14)
      
      expect(testBags.map(b => b.id)).toEqual(originalOrder)
    })
  })

  describe('filterActiveBags', () => {
    it('should include bags with remaining grams', () => {
      const result = filterActiveBags(testBags)

      const hasRemaining = result.filter(bag => (bag.remaining_g || 0) > 0)
      expect(hasRemaining).toHaveLength(2) // Ethiopia and Colombia
    })

    it('should exclude fully archived bags', () => {
      const result = filterActiveBags(testBags)

      const archivedBag = result.find(bag => bag.id === 'bag4')
      expect(archivedBag).toBeUndefined() // Kenya has no remaining
    })

    it('should return 2 active bags from test data', () => {
      const result = filterActiveBags(testBags)
      expect(result).toHaveLength(2) // Ethiopia, Colombia
    })
  })

  describe('getBagStats', () => {
    it('should calculate correct statistics', () => {
      const stats = getBagStats(testBags)

      expect(stats.total).toBe(4)
      expect(stats.active).toBe(2) // Ethiopia, Colombia
      expect(stats.archived).toBe(2) // Panama, Kenya
      expect(stats.totalRemaining).toBe(250) // 150 + 100
      expect(stats.totalFrozen).toBe(0)
    })

    it('should handle empty bags array', () => {
      const stats = getBagStats([])

      expect(stats.total).toBe(0)
      expect(stats.active).toBe(0)
      expect(stats.archived).toBe(0)
      expect(stats.totalRemaining).toBe(0)
      expect(stats.totalFrozen).toBe(0)
    })
  })

  describe('searchBags', () => {
    it('should search by name', () => {
      const result = searchBags(testBags, 'Ethiopia')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Ethiopia Yirgacheffe')
    })

    it('should search by roaster', () => {
      const result = searchBags(testBags, 'Blue Bottle')
      expect(result).toHaveLength(1)
      expect(result[0].roaster).toBe('Blue Bottle')
    })

    it('should search by variety', () => {
      const result = searchBags(testBags, 'Geisha')
      expect(result).toHaveLength(1)
      expect(result[0].variety).toBe('Geisha')
    })

    it('should search by process', () => {
      const result = searchBags(testBags, 'Washed')
      expect(result).toHaveLength(2) // Ethiopia and Kenya
    })

    it('should be case insensitive', () => {
      const result = searchBags(testBags, 'colombia')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Colombia Huila')
    })

    it('should handle partial matches', () => {
      const result = searchBags(testBags, 'Col')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Colombia Huila')
    })

    it('should return empty array for no matches', () => {
      const result = searchBags(testBags, 'NonExistentCoffee')
      expect(result).toHaveLength(0)
    })

    it('should return all bags for empty query', () => {
      const result = searchBags(testBags, '')
      expect(result).toHaveLength(testBags.length)
    })

    it('should return all bags for whitespace-only query', () => {
      const result = searchBags(testBags, '   ')
      expect(result).toHaveLength(testBags.length)
    })

    it('should search in notes when available', () => {
      const bagsWithNotes = [
        { ...testBags[0], notes: 'Floral and citrusy notes' }
      ]
      
      const result = searchBags(bagsWithNotes, 'floral')
      expect(result).toHaveLength(1)
    })
  })
})