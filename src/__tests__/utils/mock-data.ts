import { Bag, ConsumeLog } from '@/lib/types'

export const mockConsumeLog: ConsumeLog = {
  id: 'log-1',
  date: '2025-09-08',
  grams: 14,
  grindSize: '中挽き',
  waterTemp: 92,
  waterAmount: 200,
  notes: 'Perfect extraction',
  reducesStock: true,
}

export const mockBag: Bag = {
  id: 'bag-1',
  name: 'Ethiopia Yirgacheffe',
  roaster: 'Test Roaster',
  process: 'Washed',
  variety: 'Heirloom',
  roastDate: '2025-09-05',
  purchaseDate: '2025-09-06',
  bagWeight_g: 200,
  priceJPY: 2500,
  remaining_g: 186,
  bagDose_g: 14,
  notes: 'Floral, citrus, bright acidity',
  consumeLogs: [mockConsumeLog],
}

export const mockBags: Bag[] = [
  mockBag,
  {
    ...mockBag,
    id: 'bag-2',
    name: 'Colombia Huila',
    roaster: 'Another Roaster',
    process: 'Natural',
    variety: 'Caturra',
    remaining_g: 150,
    notes: 'Chocolate, caramel, smooth',
  },
  {
    ...mockBag,
    id: 'bag-3',
    name: 'Panama Geisha',
    roaster: 'Premium Roaster',
    process: 'Honey',
    variety: 'Geisha',
    priceJPY: 8000,
    remaining_g: 0, // Archived bag
    notes: 'Tropical fruit, complex',
  },
]