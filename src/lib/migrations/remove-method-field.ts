import { db } from '../db'
import type { ConsumeLog } from '../types'

/**
 * Removes the deprecated 'method' field from all ConsumeLog entries
 * in the database. This migration is safe to run multiple times.
 */
export async function removeMethodFieldFromConsumeLogs(): Promise<void> {
  try {
    // Skip migration if update method is not available (e.g., in tests)
    if (!db.bags.update) {
      return
    }

    const bags = await db.bags.toArray()

    for (const bag of bags) {
      if (bag.consumeLogs && bag.consumeLogs.length > 0) {
        const cleanedLogs = bag.consumeLogs.map(log => {
          // Remove method field if it exists
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { method, ...cleanLog } = log as ConsumeLog & { method?: string }
          return cleanLog as ConsumeLog
        })

        await db.bags.update(bag.id, { consumeLogs: cleanedLogs })
      }
    }

    console.log(`Migration complete: Removed method field from ${bags.length} bags`)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}
