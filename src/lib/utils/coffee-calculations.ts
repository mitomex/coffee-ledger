import { ConsumeLog } from '@/lib/types'

/**
 * Calculate how many cups can be made from remaining coffee grams
 * @param remainingGrams - Grams of coffee remaining
 * @param dosePerCup - Grams per cup
 * @returns Number of complete cups that can be made
 */
export function calculateRemainingCups(remainingGrams: number, dosePerCup: number): number {
  if (dosePerCup <= 0 || remainingGrams <= 0) {
    return 0
  }
  
  return Math.floor(remainingGrams / dosePerCup)
}

/**
 * Calculate average daily consumption from consume logs
 * @param logs - Array of consume logs
 * @param periodDays - Number of days to calculate average over
 * @returns Average grams consumed per day
 */
export function calculateDailyConsumption(logs: ConsumeLog[], periodDays: number): number {
  if (logs.length === 0 || periodDays <= 0) {
    return 0
  }
  
  const totalConsumed = logs
    .filter(log => log.reducesStock)
    .reduce((sum, log) => sum + log.grams, 0)
  
  return totalConsumed / periodDays
}

/**
 * Calculate how many days until coffee runs out
 * @param remainingGrams - Grams of coffee remaining
 * @param dailyConsumption - Average daily consumption in grams
 * @returns Number of days until empty
 */
export function calculateDaysUntilEmpty(remainingGrams: number, dailyConsumption: number): number {
  if (remainingGrams <= 0) {
    return 0
  }
  
  if (dailyConsumption <= 0) {
    return dailyConsumption === 0 ? Infinity : 0
  }
  
  return Math.floor(remainingGrams / dailyConsumption)
}