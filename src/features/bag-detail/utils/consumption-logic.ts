import type { Bag, ConsumeLog } from '@/lib/types'

export function createQuickConsumeLog(dose: number): ConsumeLog {
  return {
    id: `c${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    grams: dose,
    reducesStock: true
  }
}

export function createDetailedConsumeLog(
  dose: number,
  grindSize?: string,
  waterTemp?: number,
  waterAmount?: number,
  notes?: string,
  reducesStock: boolean = true
): ConsumeLog {
  return {
    id: `c${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString().split('T')[0],
    grams: dose,
    grindSize: grindSize || undefined,
    waterTemp: waterTemp || undefined,
    waterAmount: waterAmount || undefined,
    notes: notes || undefined,
    reducesStock
  }
}

export function consumeFromBag(bag: Bag, dose: number, reduceStock: boolean = true): Bag {
  const consumeLog = createQuickConsumeLog(dose)

  return {
    ...bag,
    remaining_g: reduceStock ? Math.max(0, bag.remaining_g - dose) : bag.remaining_g,
    consumeLogs: [...bag.consumeLogs, consumeLog]
  }
}

export function addConsumeLogToBag(bag: Bag, log: ConsumeLog, reduceStock: boolean = true): Bag {
  return {
    ...bag,
    remaining_g: reduceStock ? Math.max(0, bag.remaining_g - log.grams) : bag.remaining_g,
    consumeLogs: [...bag.consumeLogs, log]
  }
}