import { render, screen } from '../../../__tests__/utils/test-utils'
import { useRouter } from 'next/navigation'
import HistoryPage from '../HistoryPage'
import { db } from '@/lib/db'
import type { Bag } from '@/lib/types'

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/db', () => ({ db: { bags: { toArray: jest.fn() } } }))
jest.mock('@/lib/utils/image', () => ({ getValidImageUrl: jest.fn(async () => 'default-image.jpg') }))

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

const finished = (id: string, name: string): Bag => ({
  id,
  name,
  roaster: 'Roaster',
  process: 'Washed',
  purchaseDate: '2025-06-05',
  roastDate: '2025-06-01',
  bagWeight_g: 200,
  remaining_g: 0,
  consumeLogs: [{ id: `${id}-log`, date: '2025-06-20', grams: 200, reducesStock: true }],
})

describe('HistoryPage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.mockReturnValue({
      push: jest.fn(), back: jest.fn(), forward: jest.fn(),
      refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it('names each detail button after the bag it opens', async () => {
    jest.mocked(db.bags.toArray).mockResolvedValue([finished('a', 'Ethiopia Guji'), finished('b', 'Kenya Nyeri')])
    render(<HistoryPage />)
    expect(await screen.findByRole('button', { name: 'Ethiopia Gujiの詳細' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kenya Nyeriの詳細' })).toBeInTheDocument()
  })
})
