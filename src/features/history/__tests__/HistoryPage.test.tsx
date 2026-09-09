import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import HistoryPage from '../HistoryPage'
import { db } from '@/lib/db'
import type { Bag } from '@/lib/types'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    bags: {
      toArray: jest.fn(),
    },
  },
}))

// Mock image utils
jest.mock('@/lib/utils/image', () => ({
  getValidImageUrl: jest.fn((url) => url || 'default-image.jpg'),
}))

const mockPush = jest.fn()
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('HistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      bfcacheId: 'test-bfcache',
    })
  })

  const mockArchivedBags: Bag[] = [
    {
      id: 'archived-1',
      name: 'Archived Coffee 1',
      roaster: 'Old Roaster',
      process: 'Washed',
      variety: 'Bourbon',
      roastDate: '2024-06-01',
      purchaseDate: '2024-06-05',
      bagWeight_g: 200,
      priceJPY: 2500,
      remaining_g: 0, // Archived
      notes: 'Finished bag',
      consumeLogs: [
        { id: 'log-1', date: '2024-06-10', grams: 100, reducesStock: true },
        { id: 'log-2', date: '2024-06-15', grams: 100, reducesStock: true }
      ]
    },
    {
      id: 'archived-2',
      name: 'Archived Coffee 2',
      roaster: 'Past Roaster',
      process: 'Natural',
      variety: 'Geisha',
      roastDate: '2024-05-01',
      purchaseDate: '2024-05-05',
      bagWeight_g: 250,
      priceJPY: 3500,
      remaining_g: 0, // Archived
      consumeLogs: [
        { id: 'log-3', date: '2024-05-20', grams: 150, reducesStock: true },
        { id: 'log-4', date: '2024-05-25', grams: 100, reducesStock: true }
      ]
    }
  ]

  const mockActiveBag: Bag = {
    id: 'active-1',
    name: 'Active Coffee',
    roaster: 'Current Roaster',
    process: 'Honey',
    purchaseDate: '2025-01-01',
    bagWeight_g: 200,
    remaining_g: 100, // Still has remaining
    consumeLogs: []
  }

  it('should use the same page shell width as the inventory list', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([])

    const { container } = render(<HistoryPage />)

    await waitFor(() => {
      expect(screen.getByText('飲み切った豆')).toBeInTheDocument()
    })

    expect(container.querySelector('.page-shell')).toBeInTheDocument()
    expect(container.querySelector('.page-shell__content')).toBeInTheDocument()
    expect(container.querySelector('.max-w-3xl')).not.toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof db.bags.toArray>
    ) // Never resolves
    
    render(<HistoryPage />)
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should display archived bags only', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([...mockArchivedBags, mockActiveBag])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('飲み切った豆')).toBeInTheDocument()
    })
    
    // Should show archived bags
    expect(screen.getByText('Archived Coffee 1')).toBeInTheDocument()
    expect(screen.getByText('Archived Coffee 2')).toBeInTheDocument()
    
    // Should NOT show active bag
    expect(screen.queryByText('Active Coffee')).not.toBeInTheDocument()
  })

  it('should show empty state when no archived bags', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([mockActiveBag]) // Only active bag
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('飲み切った豆はありません')).toBeInTheDocument()
    })
  })

  it('should display bag details correctly', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([mockArchivedBags[0]])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Archived Coffee 1')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Old Roaster', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Bourbon', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Washed', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('2024-06-05（購入）', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('￥2,500', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('購入 200g', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('累計消費（ログ） 200g', { exact: false })).toBeInTheDocument()
  })

  it('should show last consume date when available', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([mockArchivedBags[0]])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('最終記録', { exact: false })).toBeInTheDocument()
    })
  })

  it('should handle sort order change', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(mockArchivedBags)
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('飲み切った豆')).toBeInTheDocument()
    })
    
    const sortSelect = screen.getByRole('combobox')
    expect(sortSelect).toHaveValue('purchase-desc')
    
    // Change to ascending order
    await user.selectOptions(sortSelect, 'purchase-asc')
    expect(sortSelect).toHaveValue('purchase-asc')
  })

  it('should navigate to bag detail when detail button is clicked', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([mockArchivedBags[0]])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Archived Coffee 1')).toBeInTheDocument()
    })
    
    const detailButton = screen.getByRole('button', { name: /の詳細$/ })
    await user.click(detailButton)
    
    expect(mockPush).toHaveBeenCalledWith('/bags/archived-1')
  })

  it('should navigate back to home when back button is clicked', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('飲み切った豆')).toBeInTheDocument()
    })
    
    const backButton = screen.getByRole('button', { name: /戻る/ })
    await user.click(backButton)
    
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('should handle database error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockRejectedValue(new Error('Database error'))
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('飲み切った豆')).toBeInTheDocument()
    })
    
    expect(consoleError).toHaveBeenCalledWith('Failed to load bags:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('should sort bags by purchase date descending by default', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(mockArchivedBags)
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('飲み切った豆')).toBeInTheDocument()
    })
    
    const bagNames = screen.getAllByText(/Archived Coffee \d/)
    // First bag should be the one with more recent purchase date
    expect(bagNames[0]).toHaveTextContent('Archived Coffee 1')
    expect(bagNames[1]).toHaveTextContent('Archived Coffee 2')
  })

  it('should calculate consumed amount correctly', async () => {
    const bagWithMultipleLogs: Bag = {
      ...mockArchivedBags[0],
      bagWeight_g: 45,
      consumeLogs: [
        { id: 'log-1', date: '2024-06-10', grams: 14, reducesStock: true },
        { id: 'log-2', date: '2024-06-15', grams: 15, reducesStock: true },
        { id: 'log-3', date: '2024-06-20', grams: 10, reducesStock: false }, // Doesn't reduce stock
        { id: 'log-4', date: '2024-06-25', grams: 16, reducesStock: true }
      ]
    }
    
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([bagWithMultipleLogs])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Archived Coffee 1')).toBeInTheDocument()
    })
    
    // Should sum only logs where reducesStock is true: 14 + 15 + 16 = 45
    expect(screen.getByText('累計消費（ログ） 45g', { exact: false })).toBeInTheDocument()
  })

  it('should display explanation text', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('※ 総量が登録され、全量消費済みの袋を表示。')).toBeInTheDocument()
    })
  })

  it('should not display bags without registered total weight', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    const bagWithoutTotal: Bag = {
      ...mockArchivedBags[0],
      bagWeight_g: 0,
    }
    mockToArray.mockResolvedValue([bagWithoutTotal])

    render(<HistoryPage />)

    await waitFor(() => {
      expect(screen.getByText('飲み切った豆はありません')).toBeInTheDocument()
    })

    expect(screen.queryByText(bagWithoutTotal.name)).not.toBeInTheDocument()
  })

  it('should not display bags that are not fully consumed', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    const bagNotFullyConsumed: Bag = {
      ...mockArchivedBags[0],
      consumeLogs: [
        { id: 'log-1', date: '2024-06-10', grams: 120, reducesStock: true },
      ],
    }
    mockToArray.mockResolvedValue([bagNotFullyConsumed])

    render(<HistoryPage />)

    await waitFor(() => {
      expect(screen.getByText('飲み切った豆はありません')).toBeInTheDocument()
    })

    expect(screen.queryByText(bagNotFullyConsumed.name)).not.toBeInTheDocument()
  })

  it('should handle bags without price', async () => {
    const bagWithoutPrice: Bag = {
      ...mockArchivedBags[0],
      priceJPY: undefined
    }
    
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([bagWithoutPrice])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Archived Coffee 1')).toBeInTheDocument()
    })
    
    // Price should not be displayed
    expect(screen.queryByText('￥')).not.toBeInTheDocument()
  })

  it('should handle bags without variety', async () => {
    const bagWithoutVariety: Bag = {
      ...mockArchivedBags[0],
      variety: undefined
    }
    
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([bagWithoutVariety])
    
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Archived Coffee 1')).toBeInTheDocument()
    })
    
    // Should display without variety
    expect(screen.getByText('Old Roaster / Washed', { exact: false })).toBeInTheDocument()
  })
})
