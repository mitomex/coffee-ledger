import { checkAndCreateSubscriptions } from '../subscription'
import { db } from '../db'
import { mockBag } from '@/__tests__/utils/mock-data'

jest.mock('../db', () => ({ db: {
  transaction: jest.fn(async (_mode, _table, callback) => callback()),
  bags: { filter: jest.fn(), get: jest.fn(), add: jest.fn(), update: jest.fn() },
} }))

it('creates an identifiable stock bag from a due setting without carrying over its logs', async () => {
  const template = { ...mockBag, id: 'monthly', isSubscriptionTemplate: true,
    subscriptionInfo: { dayOfMonth: 1, nextDeliveryDate: '2025-01-01', startDate: '2024-12-01', isActive: true } }
  jest.mocked(db.bags.filter).mockReturnValue({ toArray: async () => [template] } as ReturnType<typeof db.bags.filter>)
  jest.mocked(db.bags.get).mockResolvedValue(template)
  await checkAndCreateSubscriptions()
  expect(db.bags.add).toHaveBeenCalledWith(expect.objectContaining({
    id: expect.any(String), isSubscriptionTemplate: false, subscriptionTemplateId: 'monthly',
    consumeLogs: [], remaining_g: template.bagWeight_g, purchaseDate: '2025-01-01',
  }))
  expect(jest.mocked(db.bags.add).mock.calls[0][0].id).not.toBe('monthly')
  expect(db.bags.update).toHaveBeenCalledWith('monthly', { 'subscriptionInfo.nextDeliveryDate': '2025-02-01' })
})
