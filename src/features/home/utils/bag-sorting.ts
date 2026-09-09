import type { Bag } from '@/lib/types'
import { resolveDose, cupsLeft } from '@/lib/utils/coffee'

export type SortKey = 'date-asc' | 'date-desc' | 'process' | 'remain-asc' | 'remain-desc'

export function sortBags(bags: Bag[], sortKey: SortKey, appDose: number): Bag[] {
  const arr = [...bags]
  
  const getDate = (b: Bag) => new Date(b.roastDate || b.purchaseDate).getTime()
  const getProcessRank = (p: string) => ['Washed', 'Honey', 'Natural', 'Anaerobic'].indexOf(p)
  const getRemainingCups = (b: Bag) => cupsLeft(b.remaining_g, resolveDose(appDose, b.roaster, b.bagDose_g))
  
  arr.sort((a, b) => {
    if (sortKey === 'date-asc') return getDate(a) - getDate(b)
    if (sortKey === 'date-desc') return getDate(b) - getDate(a)
    if (sortKey === 'process') return getProcessRank(a.process) - getProcessRank(b.process)
    if (sortKey === 'remain-asc') return getRemainingCups(a) - getRemainingCups(b)
    if (sortKey === 'remain-desc') return getRemainingCups(b) - getRemainingCups(a)
    return 0
  })
  
  return arr
}

export function filterActiveBags(bags: Bag[]): Bag[] {
  return bags.filter(bag => {
    // If bag has remaining grams, it's active
    const hasRemaining = (bag.remaining_g || 0) > 0
    return hasRemaining
  })
}

export function getBagStats(bags: Bag[]) {
  const activeBags = filterActiveBags(bags)
  const archivedBags = bags.filter(bag => !activeBags.includes(bag))

  const totalRemaining = activeBags.reduce((sum, bag) => sum + (bag.remaining_g || 0), 0)

  return {
    total: bags.length,
    active: activeBags.length,
    archived: archivedBags.length,
    totalRemaining,
    totalFrozen: 0
  }
}

export function searchBags(bags: Bag[], query: string): Bag[] {
  if (!query.trim()) return bags
  
  const lowercaseQuery = query.toLowerCase()
  
  return bags.filter(bag => 
    bag.name.toLowerCase().includes(lowercaseQuery) ||
    bag.roaster.toLowerCase().includes(lowercaseQuery) ||
    (bag.variety && bag.variety.toLowerCase().includes(lowercaseQuery)) ||
    bag.process.toLowerCase().includes(lowercaseQuery) ||
    (bag.notes && bag.notes.toLowerCase().includes(lowercaseQuery))
  )
}