import { db } from './db'
import { withUpdatedBagMetadata } from './utils/bag-metadata'

/** Delete only the selected object; keep related bags and repair set links atomically. */
export async function deleteBag(bagId: string): Promise<void> {
  await db.transaction('rw', db.bags, async () => {
    const selected = await db.bags.get(bagId)
    if (!selected) return
    const bags = await db.bags.toArray()
    for (const bag of bags) {
      if (bag.id === bagId) continue
      const isChild = bag.parentBagId === bagId
      const referencesChild = bag.childBagIds?.includes(bagId)
      if (isChild || referencesChild) {
        await db.bags.put(withUpdatedBagMetadata({
          ...bag,
          parentBagId: isChild ? undefined : bag.parentBagId,
          childBagIds: referencesChild ? bag.childBagIds?.filter(id => id !== bagId) : bag.childBagIds,
        }))
      }
    }
    await db.bags.delete(bagId)
  })
}
