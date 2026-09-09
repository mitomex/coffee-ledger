import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ExtractionDetailPage from '../ExtractionDetailPage'
import { db } from '@/lib/db'
import { mockBag } from '../../../__tests__/utils/mock-data'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    bags: {
      get: jest.fn(),
      put: jest.fn(),
    },
  },
}))

const mockPush = jest.fn()
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

const mockConsumeLogFull = {
  id: 'log-full',
  date: '2025-09-08',
  grams: 15,
  grindSize: '中挽き',
  waterTemp: 92,
  waterAmount: 200,
  dripper: 'V60',
  grinder: 'Comandante C40',
  brewTime: '2:30',
  yieldAmount: 180,
  bloomTime: 30,
  rating: 4,
  notes: 'フルーティーで明るい酸味',
  reducesStock: true,
}

describe('ExtractionDetailPage', () => {
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

  it('should show loading state initially', () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof db.bags.get>
    )

    render(<ExtractionDetailPage bagId="bag-1" logId="log-1" />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should show not found message when bag does not exist', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(undefined)

    render(<ExtractionDetailPage bagId="missing" logId="log-1" />)

    await waitFor(() => {
      expect(screen.getByText('抽出記録が見つかりません')).toBeInTheDocument()
    })
  })

  it('should show not found message when log does not exist', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<ExtractionDetailPage bagId={mockBag.id} logId="missing-log" />)

    await waitFor(() => {
      expect(screen.getByText('抽出記録が見つかりません')).toBeInTheDocument()
    })
  })

  it('should display all extraction details', async () => {
    const bagWithFullLog = {
      ...mockBag,
      consumeLogs: [mockConsumeLogFull],
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(bagWithFullLog)

    render(<ExtractionDetailPage bagId={bagWithFullLog.id} logId={mockConsumeLogFull.id} />)

    // Wait for loading
    await waitFor(() => {
      expect(screen.getByText('抽出記録')).toBeInTheDocument()
    })

    // Check all fields are displayed
    expect(screen.getByText('15g')).toBeInTheDocument()
    expect(screen.getByText('中挽き')).toBeInTheDocument()
    expect(screen.getByText('92℃')).toBeInTheDocument()
    expect(screen.getByText('200g')).toBeInTheDocument()
    expect(screen.getByText('V60')).toBeInTheDocument()
    expect(screen.getByText('Comandante C40')).toBeInTheDocument()
    expect(screen.getByText('2:30')).toBeInTheDocument()
    expect(screen.getByText('180ml')).toBeInTheDocument()
    expect(screen.getByText('30秒')).toBeInTheDocument()
    expect(screen.getByText(/フルーティーで明るい酸味/)).toBeInTheDocument()
    // Rating should show stars
    expect(screen.getByText(/★★★★☆/)).toBeInTheDocument()
  })

  it('should display bag name', async () => {
    const bagWithFullLog = {
      ...mockBag,
      consumeLogs: [mockConsumeLogFull],
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(bagWithFullLog)

    render(<ExtractionDetailPage bagId={bagWithFullLog.id} logId={mockConsumeLogFull.id} />)

    await waitFor(() => {
      expect(screen.getByText(mockBag.name)).toBeInTheDocument()
    })
  })

  it('should navigate back to bag detail when back button clicked', async () => {
    const user = userEvent.setup()
    const bagWithFullLog = {
      ...mockBag,
      consumeLogs: [mockConsumeLogFull],
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(bagWithFullLog)

    render(<ExtractionDetailPage bagId={bagWithFullLog.id} logId={mockConsumeLogFull.id} />)

    await waitFor(() => {
      expect(screen.getByText('抽出記録')).toBeInTheDocument()
    })

    const backButton = screen.getByRole('button', { name: /戻る/ })
    await user.click(backButton)

    expect(mockPush).toHaveBeenCalledWith(`/bags/${bagWithFullLog.id}`)
  })

  it('should navigate to edit page when edit button clicked', async () => {
    const user = userEvent.setup()
    const bagWithFullLog = {
      ...mockBag,
      consumeLogs: [mockConsumeLogFull],
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(bagWithFullLog)

    render(<ExtractionDetailPage bagId={bagWithFullLog.id} logId={mockConsumeLogFull.id} />)

    await waitFor(() => {
      expect(screen.getByText('抽出記録')).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /編集/ })
    await user.click(editButton)

    expect(mockPush).toHaveBeenCalledWith(`/bags/${bagWithFullLog.id}/extraction/${mockConsumeLogFull.id}/edit`)
  })

  it('should delete log and navigate back when delete button clicked', async () => {
    const user = userEvent.setup()
    const bagWithFullLog = {
      ...mockBag,
      remaining_g: 185,
      consumeLogs: [mockConsumeLogFull],
    }
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(bagWithFullLog)
    mockPut.mockResolvedValue('updated-id')

    render(<ExtractionDetailPage bagId={bagWithFullLog.id} logId={mockConsumeLogFull.id} />)

    await waitFor(() => {
      expect(screen.getByText('抽出記録')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /削除/ })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          consumeLogs: [],
          remaining_g: 200, // 185 + 15 = 200 (restored)
        })
      )
    })

    expect(mockPush).toHaveBeenCalledWith(`/bags/${bagWithFullLog.id}`)
  })

  it('should handle partial extraction data gracefully', async () => {
    const partialLog = {
      id: 'log-partial',
      date: '2025-09-08',
      grams: 14,
      reducesStock: true,
    }
    const bagWithPartialLog = {
      ...mockBag,
      consumeLogs: [partialLog],
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(bagWithPartialLog)

    render(<ExtractionDetailPage bagId={bagWithPartialLog.id} logId={partialLog.id} />)

    await waitFor(() => {
      expect(screen.getByText('抽出記録')).toBeInTheDocument()
    })

    // Should show grams and date
    expect(screen.getByText('14g')).toBeInTheDocument()
    // Should not crash with missing optional fields
  })
})
