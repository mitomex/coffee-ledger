import { db } from '../db'

/**
 * Removes the deprecated 'peak' field from all Bag entries
 * in the database. This migration is safe to run multiple times.
 *
 * The peak status feature was deprecated in October 2025.
 */
export async function removePeakFieldFromBags(): Promise<void> {
  try {
    // Skip migration if update method is not available (e.g., in tests)
    if (!db.bags.update) {
      return
    }

    const bags = await db.bags.toArray()
    let updatedCount = 0

    for (const bag of bags) {
      // Check if peak exists in the bag
      if ('peak' in bag) {
        // Remove peak field
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { peak, ...cleanBag } = bag as typeof bag & { peak?: unknown }

        await db.bags.put(cleanBag)
        updatedCount++
      }
    }

    console.log(`Migration complete: Removed peak field from ${updatedCount} bags`)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}
