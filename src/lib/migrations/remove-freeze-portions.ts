import { db } from '../db'

/**
 * Removes the deprecated 'freezePortions' field from all Bag entries
 * in the database. This migration is safe to run multiple times.
 *
 * The freeze feature was deprecated in September 2025.
 */
export async function removeFreezePortionsFromBags(): Promise<void> {
  try {
    // Skip migration if update method is not available (e.g., in tests)
    if (!db.bags.update) {
      return
    }

    const bags = await db.bags.toArray()
    let updatedCount = 0

    for (const bag of bags) {
      // Check if freezePortions exists in the bag
      if ('freezePortions' in bag) {
        // Remove freezePortions field
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { freezePortions, ...cleanBag } = bag as typeof bag & { freezePortions?: unknown }

        await db.bags.put(cleanBag)
        updatedCount++
      }
    }

    console.log(`Migration complete: Removed freezePortions from ${updatedCount} bags`)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}
