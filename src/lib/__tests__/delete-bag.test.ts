import { deleteBag } from '../delete-bag'
import { db } from '../db'
import { mockBag } from '@/__tests__/utils/mock-data'

jest.mock('../db', () => ({ db: {
  transaction: jest.fn(async (_mode, _table, callback) => callback()),
  bags: { get: jest.fn(), put: jest.fn(), delete: jest.fn(), toArray: jest.fn() },
} }))

beforeEach(() => jest.clearAllMocks())

it('detaches children without deleting their stock or logs when deleting a set', async () => {
  const parent = { ...mockBag, id: 'set', isSet: true, childBagIds: ['child'] }
  const child = { ...mockBag, id: 'child', parentBagId: 'set' }
  jest.mocked(db.bags.get).mockResolvedValue(parent)
  jest.mocked(db.bags.toArray).mockResolvedValue([parent, child])
  await deleteBag('set')
  expect(db.bags.put).toHaveBeenCalledWith(expect.objectContaining({
    id: 'child', parentBagId: undefined, remaining_g: child.remaining_g, consumeLogs: child.consumeLogs,
  }))
  expect(db.bags.delete).toHaveBeenCalledTimes(1)
  expect(db.bags.delete).toHaveBeenCalledWith('set')
})

it('removes the deleted child from its parent', async () => {
  const parent = { ...mockBag, id: 'set', isSet: true, childBagIds: ['child', 'other'] }
  const child = { ...mockBag, id: 'child', parentBagId: 'set' }
  jest.mocked(db.bags.get).mockResolvedValue(child)
  jest.mocked(db.bags.toArray).mockResolvedValue([parent, child])
  await deleteBag('child')
  expect(db.bags.put).toHaveBeenCalledWith(expect.objectContaining({ id: 'set', childBagIds: ['other'] }))
})
