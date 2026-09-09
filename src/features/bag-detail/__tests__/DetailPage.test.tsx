import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import DetailPage from '../DetailPage'
import EditExtractionRoute from '@/app/bags/[id]/extraction/[logId]/edit/page'
import { db } from '@/lib/db'
import { deleteBag } from '@/lib/delete-bag'
import { mockBag } from '../../../__tests__/utils/mock-data'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock database
jest.mock('@/lib/delete-bag', () => ({ deleteBag: jest.fn() }))

jest.mock('@/lib/db', () => ({
  db: {
    bags: {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock image utils
jest.mock('@/lib/utils/image', () => ({
  getValidImageUrl: jest.fn((url?: string) => url || 'default-image.jpg'),
}))

const mockPush = jest.fn()
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('DetailPage', () => {
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
    ) // Never resolves

    render(<DetailPage bagId="test-bag-id" />)
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should show not found message when bag is not found', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(undefined)

    render(<DetailPage bagId="nonexistent-bag" />)
    
    await waitFor(() => {
      expect(screen.getByText('コーヒー豆が見つかりません')).toBeInTheDocument()
    })
    
    expect(screen.getByText('ホームに戻る')).toBeInTheDocument()
  })

  it('should render bag details when bag is loaded', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<DetailPage bagId={mockBag.id} />)
    
    await waitFor(() => {
      expect(screen.getByText(mockBag.name)).toBeInTheDocument()
    })
    
    expect(screen.getByText(mockBag.roaster, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(`${mockBag.remaining_g}g`)).toBeInTheDocument()
    expect(screen.getByText(mockBag.process)).toBeInTheDocument()
  })

  it('preserves paragraph spacing in notes when double newlines exist', async () => {
    const mockGet = jest.mocked(db.bags.get)
    const spacedNotesBag = {
      ...mockBag,
      notes: 'Line 1\n\nLine 2',
    }
    mockGet.mockResolvedValue(spacedNotesBag)

    render(<DetailPage bagId={spacedNotesBag.id} />)

    await waitFor(() => {
      expect(screen.getByText(spacedNotesBag.name)).toBeInTheDocument()
    })

    const label = screen.getByText('フレーバーノート')
    const notesContainer = label.nextElementSibling as HTMLElement | null
    expect(notesContainer).toBeTruthy()
    expect(notesContainer?.textContent).toContain('Line 1')
    expect(notesContainer?.textContent).toContain('Line 2')
    expect(notesContainer?.querySelectorAll('br').length).toBeGreaterThan(1)
  })

  it('displays unified site wordmark styling', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<DetailPage bagId={mockBag.id} />)

    const wordmark = await screen.findByText('Coffee Ledger')
    expect(wordmark).toHaveClass('tracking-tight text-lg sm:text-xl font-semibold')
  })

  it('should navigate to record page when log button is clicked', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<DetailPage bagId={mockBag.id} />)

    await waitFor(() => {
      expect(screen.getByText(mockBag.name)).toBeInTheDocument()
    })

    const logButton = screen.getByRole('button', { name: '抽出を記録' })
    await user.click(logButton)

    expect(mockPush).toHaveBeenCalledWith(`/bags/${mockBag.id}/record`)
  })

  it('should navigate to edit page when edit button is clicked', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<DetailPage bagId={mockBag.id} />)
    
    await waitFor(() => {
      expect(screen.getByText(mockBag.name)).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: 'バッグを編集' })
    await user.click(editButton)

    expect(mockPush).toHaveBeenCalledWith(`/bags/${mockBag.id}/edit`)
  })

  it('should navigate back when back button is clicked', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<DetailPage bagId={mockBag.id} />)
    
    await waitFor(() => {
      expect(screen.getByText(mockBag.name)).toBeInTheDocument()
    })

    const backButton = screen.getByRole('button', { name: /戻る/ })
    await user.click(backButton)

    expect(mockPush).toHaveBeenCalledWith('/')
  })

  // Deletion flow moved to EditBagPage tests

  describe('Parent Bag Display', () => {
    it('should display set information for parent bag', async () => {
      const childBag1 = {
        ...mockBag,
        id: 'child-1',
        name: 'Child Bag 1',
        parentBagId: 'parent-1',
        bagWeight_g: 300,
        remaining_g: 300,
      }

      const childBag2 = {
        ...mockBag,
        id: 'child-2',
        name: 'Child Bag 2',
        parentBagId: 'parent-1',
        bagWeight_g: 300,
        remaining_g: 300,
      }

      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        isSet: true,
        childBagIds: ['child-1', 'child-2'],
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
          totalWeight_g: 600,
        },
      }

      jest.mocked(db.bags.get)
        .mockResolvedValueOnce(parentBag)
        .mockResolvedValueOnce(childBag1)
        .mockResolvedValueOnce(childBag2)

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('セット内容')).toBeInTheDocument()
      })

      // Should display set price in multiple places (purchase info and set card)
      const priceElements = screen.getAllByText(/6,000/)
      expect(priceElements.length).toBeGreaterThan(0)
      expect(screen.getByText(/2件/)).toBeInTheDocument() // 子Bag数
    })

    it('should not display consumption-related information for parent bag', async () => {
      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        name: 'Test Set',
        isSet: true,
        childBagIds: [],
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get).mockResolvedValueOnce(parentBag)

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('セット内容')).toBeInTheDocument()
      })

      // Should NOT display consumption-related information
      expect(screen.queryByText(/残量/)).not.toBeInTheDocument()
      expect(screen.queryByText(/あと/)).not.toBeInTheDocument()
      expect(screen.queryByText(/杯/)).not.toBeInTheDocument()
      expect(screen.queryByText('消費履歴')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /抽出を記録/ })).not.toBeInTheDocument()
    })

    it('should display child bag list with details for parent bag', async () => {
      const childBag1 = {
        ...mockBag,
        id: 'child-1',
        name: 'Ethiopia Natural',
        parentBagId: 'parent-1',
        remaining_g: 200,
      }

      const childBag2 = {
        ...mockBag,
        id: 'child-2',
        name: 'Colombia Washed',
        parentBagId: 'parent-1',
        remaining_g: 180,
      }

      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        isSet: true,
        childBagIds: ['child-1', 'child-2'],
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get)
        .mockResolvedValueOnce(parentBag)  // First call for parent bag
        .mockResolvedValueOnce(childBag1)  // Second call for child-1
        .mockResolvedValueOnce(childBag2)  // Third call for child-2

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('セット内容')).toBeInTheDocument()
      })

      // Should display "セット内容" section
      expect(screen.getByText('セット内容')).toBeInTheDocument()

      // Should display child bag names
      expect(screen.getByText('Ethiopia Natural', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('Colombia Washed', { exact: false })).toBeInTheDocument()

      // Should display remaining amounts in set content section
      expect(screen.getByText('200g')).toBeInTheDocument()
      expect(screen.getByText('180g')).toBeInTheDocument()
    })

    it('should allow navigation to child bag detail page', async () => {

      const childBag1 = {
        ...mockBag,
        id: 'child-1',
        name: 'Ethiopia Natural',
        parentBagId: 'parent-1',
        remaining_g: 200,
      }

      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        isSet: true,
        childBagIds: ['child-1'],
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get)
        .mockResolvedValueOnce(parentBag)
        .mockResolvedValueOnce(childBag1)

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('Ethiopia Natural', { exact: false })).toBeInTheDocument()
      })

      // The child object is a keyboard-focusable native link
      const childLink = screen.getByRole('link', { name: /Ethiopia Natural/ })
      expect(childLink).toHaveAttribute('href', '/bags/child-1')
      childLink.focus()
      expect(childLink).toHaveFocus()
    })

    it('should show add child bag button for parent bag', async () => {
      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        isSet: true,
        childBagIds: [],
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get).mockResolvedValueOnce(parentBag)

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /追加/ })).toBeInTheDocument()
      })
    })

    it('should navigate to add child page when button clicked', async () => {
      const user = userEvent.setup()
      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        isSet: true,
        childBagIds: [],
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get).mockResolvedValueOnce(parentBag)

      render(<DetailPage bagId="parent-1" />)

      const addButton = await screen.findByRole('button', { name: /追加/ })
      await user.click(addButton)

      expect(mockPush).toHaveBeenCalledWith('/bags/parent-1/set/add')
    })

    it('should display set total weight from child bags', async () => {
      const childBag1 = {
        ...mockBag,
        id: 'child-1',
        parentBagId: 'parent-1',
        bagWeight_g: 300,
        remaining_g: 300,
      }

      const childBag2 = {
        ...mockBag,
        id: 'child-2',
        parentBagId: 'parent-1',
        bagWeight_g: 300,
        remaining_g: 300,
      }

      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        isSet: true,
        childBagIds: ['child-1', 'child-2'],
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get)
        .mockResolvedValueOnce(parentBag)
        .mockResolvedValueOnce(childBag1)
        .mockResolvedValueOnce(childBag2)

      render(<DetailPage bagId="parent-1" />)

      // 子Bagの合計重量 (300 + 300 = 600g) が購入情報に表示される
      await waitFor(() => {
        expect(screen.getByText(/購入 600g/)).toBeInTheDocument()
      })
    })

    it('should not display variety and process for set products', async () => {
      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        name: 'Test Set',
        roaster: 'Test Roaster',
        isSet: true,
        childBagIds: [],
        remaining_g: 0,
        variety: 'Geisha',
        process: 'Washed',
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get).mockResolvedValueOnce(parentBag)

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('Test Set')).toBeInTheDocument()
      })

      // Should display roaster name
      expect(screen.getByText('Test Roaster', { exact: false })).toBeInTheDocument()

      // Should NOT display variety and process in the roaster line
      const roasterLine = screen.getByText('Test Roaster', { exact: false })
      expect(roasterLine.textContent).not.toContain('Geisha')
      expect(roasterLine.textContent).not.toContain('Washed')
      expect(roasterLine.textContent).not.toContain('未選択')
    })

    it('should display set price instead of regular price', async () => {
      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        isSet: true,
        childBagIds: [],
        remaining_g: 0,
        priceJPY: 2000, // This should be ignored for set products
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get).mockResolvedValueOnce(parentBag)

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('セット内容')).toBeInTheDocument()
      })

      // Should display set price (¥6,000) not regular price (¥2,000)
      const priceElements = screen.getAllByText(/6,000/)
      expect(priceElements.length).toBeGreaterThan(0)
      expect(screen.queryByText(/2,000/)).not.toBeInTheDocument()
    })

    it('should display sum of child bag weights as purchase weight', async () => {
      const childBag1 = {
        ...mockBag,
        id: 'child-1',
        name: 'Ethiopia Natural',
        parentBagId: 'parent-1',
        bagWeight_g: 200,
        remaining_g: 200,
      }

      const childBag2 = {
        ...mockBag,
        id: 'child-2',
        name: 'Colombia Washed',
        parentBagId: 'parent-1',
        bagWeight_g: 250,
        remaining_g: 250,
      }

      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        name: 'Test Set',
        isSet: true,
        childBagIds: ['child-1', 'child-2'],
        bagWeight_g: 0,
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get)
        .mockResolvedValueOnce(parentBag)  // First call for parent bag
        .mockResolvedValueOnce(childBag1)  // Second call for child-1
        .mockResolvedValueOnce(childBag2)  // Third call for child-2

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('セット内容')).toBeInTheDocument()
      })

      // Should display the sum of child bag weights (200 + 250 = 450g)
      expect(screen.getByText(/購入 450g/)).toBeInTheDocument()
    })

    it('should display 0g for set product with no child bags', async () => {
      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        name: 'Empty Set',
        isSet: true,
        childBagIds: [],
        bagWeight_g: 0,
        remaining_g: 0,
        setInfo: {
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
        },
      }

      jest.mocked(db.bags.get).mockResolvedValueOnce(parentBag)

      render(<DetailPage bagId="parent-1" />)

      await waitFor(() => {
        expect(screen.getByText('セット内容')).toBeInTheDocument()
      })

      // Should display 0g when no child bags
      expect(screen.getByText(/購入 0g/)).toBeInTheDocument()
    })
  })

  describe('Child Bag Display', () => {
    it('should display parent link for child bag', async () => {
      const childBag = {
        ...mockBag,
        id: 'child-1',
        parentBagId: 'parent-1',
      }

      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        name: 'Parent Set Name',
        isSet: true,
      }

      jest.mocked(db.bags.get)
        .mockResolvedValueOnce(childBag)  // First call for child
        .mockResolvedValueOnce(parentBag) // Second call for parent

      render(<DetailPage bagId="child-1" />)

      await waitFor(() => {
        expect(screen.getByText(/Parent Set Name/)).toBeInTheDocument()
        expect(screen.getByText(/の一部/)).toBeInTheDocument()
      })
    })

    it('should navigate to parent when parent link clicked', async () => {
      const user = userEvent.setup()
      const childBag = {
        ...mockBag,
        id: 'child-1',
        parentBagId: 'parent-1',
      }

      const parentBag = {
        ...mockBag,
        id: 'parent-1',
        name: 'Parent Set',
        isSet: true,
      }

      jest.mocked(db.bags.get)
        .mockResolvedValueOnce(childBag)
        .mockResolvedValueOnce(parentBag)

      render(<DetailPage bagId="child-1" />)

      const parentLink = await screen.findByRole('button', { name: /Parent Set/ })
      await user.click(parentLink)

      expect(mockPush).toHaveBeenCalledWith('/bags/parent-1')
    })
  })

  describe('Consume Log Edit/Delete', () => {
    it('should display edit and delete buttons for each consume log', async () => {
      const mockGet = jest.mocked(db.bags.get)
      mockGet.mockResolvedValue(mockBag)

      render(<DetailPage bagId={mockBag.id} />)

      await waitFor(() => {
        expect(screen.getByText('消費履歴')).toBeInTheDocument()
      })

      // Should display edit and delete buttons for each log (aria-label exact match)
      const editButtons = screen.getAllByRole('button', { name: /抽出記録を編集$/ })
      const deleteButtons = screen.getAllByRole('button', { name: /抽出記録を削除$/ })
      expect(editButtons.length).toBe(mockBag.consumeLogs.length)
      expect(deleteButtons.length).toBe(mockBag.consumeLogs.length)
    })

    it('should navigate to extraction detail page when consume log clicked', async () => {
      const user = userEvent.setup()
      const mockGet = jest.mocked(db.bags.get)
      const bagWithLog = {
        ...mockBag,
        consumeLogs: [
          { id: 'log-1', date: '2025-09-08', grams: 14, reducesStock: true },
        ],
      }
      mockGet.mockResolvedValue(bagWithLog)

      render(<DetailPage bagId={bagWithLog.id} />)

      await waitFor(() => {
        expect(screen.getByText('消費履歴')).toBeInTheDocument()
      })

      const logLink = screen.getByRole('link', { name: /抽出記録 14g/ })
      expect(logLink).toHaveAttribute('href', `/bags/${bagWithLog.id}/extraction/log-1`)
      logLink.focus()
      await user.tab()
      expect(screen.getByRole('button', { name: /抽出記録を編集$/ })).toHaveFocus()

    })

    it('should delete consume log and restore stock when delete button clicked', async () => {
      const user = userEvent.setup()
      const mockGet = jest.mocked(db.bags.get)
      const mockPut = jest.mocked(db.bags.put)
      const bagWithLog = {
        ...mockBag,
        remaining_g: 186,
        consumeLogs: [
          { id: 'log-1', date: '2025-09-08', grams: 14, reducesStock: true },
        ],
      }
      mockGet.mockResolvedValue(bagWithLog)
      mockPut.mockResolvedValue('updated-id')

      render(<DetailPage bagId={bagWithLog.id} />)

      await waitFor(() => {
        expect(screen.getByText('消費履歴')).toBeInTheDocument()
      })

      const deleteButton = screen.getByRole('button', { name: /抽出記録を削除$/ })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          expect.objectContaining({
            consumeLogs: [],
            remaining_g: 200, // 186 + 14 = 200 (restored)
          })
        )
      })
    })

    it('should not restore stock when deleting log with reducesStock=false', async () => {
      const user = userEvent.setup()
      const mockGet = jest.mocked(db.bags.get)
      const mockPut = jest.mocked(db.bags.put)
      const bagWithLog = {
        ...mockBag,
        remaining_g: 186,
        consumeLogs: [
          { id: 'log-1', date: '2025-09-08', grams: 14, reducesStock: false },
        ],
      }
      mockGet.mockResolvedValue(bagWithLog)
      mockPut.mockResolvedValue('updated-id')

      render(<DetailPage bagId={bagWithLog.id} />)

      await waitFor(() => {
        expect(screen.getByText('消費履歴')).toBeInTheDocument()
      })

      const deleteButton = screen.getByRole('button', { name: /抽出記録を削除$/ })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          expect.objectContaining({
            consumeLogs: [],
            remaining_g: 186, // No change because reducesStock was false
          })
        )
      })
    })

    it('should open edit modal when edit button clicked', async () => {
      const user = userEvent.setup()
      const mockGet = jest.mocked(db.bags.get)
      mockGet.mockResolvedValue(mockBag)

      render(<DetailPage bagId={mockBag.id} />)

      await waitFor(() => {
        expect(screen.getByText('消費履歴')).toBeInTheDocument()
      })

      // Use exact name to avoid matching "バッグを編集"
      const editButton = screen.getByRole('button', { name: /抽出記録を編集$/ })
      await user.click(editButton)

      // Should display edit form/modal
      await waitFor(() => {
        expect(screen.getByText('抽出記録を編集')).toBeInTheDocument()
      })
    })

    it('should update consume log when edit form submitted', async () => {
      const user = userEvent.setup()
      const mockGet = jest.mocked(db.bags.get)
      const mockPut = jest.mocked(db.bags.put)
      const bagWithLog = {
        ...mockBag,
        remaining_g: 186,
        consumeLogs: [
          { id: 'log-1', date: '2025-09-08', grams: 14, grindSize: '中挽き', reducesStock: true },
        ],
      }
      mockGet.mockResolvedValue(bagWithLog)
      mockPut.mockResolvedValue('updated-id')

      render(<DetailPage bagId={bagWithLog.id} />)

      await waitFor(() => {
        expect(screen.getByText('消費履歴')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /抽出記録を編集$/ })
      await user.click(editButton)

      // Wait for edit modal
      await waitFor(() => {
        expect(screen.getByText('抽出記録を編集')).toBeInTheDocument()
      })

      // Change grind size
      const grindSizeInput = screen.getByLabelText('挽き目') as HTMLInputElement
      await user.clear(grindSizeInput)
      await user.type(grindSizeInput, '粗挽き')

      // Save
      const saveButton = screen.getByRole('button', { name: '保存' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          expect.objectContaining({
            consumeLogs: [
              expect.objectContaining({
                id: 'log-1',
                grindSize: '粗挽き',
              }),
            ],
          })
        )
      })
    })

    it('should adjust remaining_g when edited grams changes with reducesStock=true', async () => {
      const user = userEvent.setup()
      const mockGet = jest.mocked(db.bags.get)
      const mockPut = jest.mocked(db.bags.put)
      const bagWithLog = {
        ...mockBag,
        remaining_g: 186,
        consumeLogs: [
          { id: 'log-1', date: '2025-09-08', grams: 14, reducesStock: true },
        ],
      }
      mockGet.mockResolvedValue(bagWithLog)
      mockPut.mockResolvedValue('updated-id')

      render(<DetailPage bagId={bagWithLog.id} />)

      await waitFor(() => {
        expect(screen.getByText('消費履歴')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /抽出記録を編集$/ })
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('抽出記録を編集')).toBeInTheDocument()
      })

      // Change grams from 14 to 20 (+6g more consumed)
      const gramsInput = screen.getByLabelText('豆量（g）') as HTMLInputElement
      await user.clear(gramsInput)
      await user.type(gramsInput, '20')

      const saveButton = screen.getByRole('button', { name: '保存' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          expect.objectContaining({
            consumeLogs: [
              expect.objectContaining({
                grams: 20,
              }),
            ],
            remaining_g: 180, // 186 - (20 - 14) = 180
          })
        )
      })
    })
  })
})


describe('OOUI actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
  })

  it('opens the selected extraction for editing and saves back to its detail', async () => {
    const user = userEvent.setup()
    const log = { id: 'selected', date: '2026-09-09', grams: 14, notes: 'before', reducesStock: true }
    jest.mocked(db.bags.get).mockResolvedValue({ ...mockBag, consumeLogs: [log] })
    jest.mocked(db.bags.put).mockResolvedValue(mockBag.id)
    render(await EditExtractionRoute({ params: Promise.resolve({ id: mockBag.id, logId: "selected" }) }))
    await screen.findByText('抽出記録を編集')
    await user.clear(screen.getByLabelText('メモ'))
    await user.type(screen.getByLabelText('メモ'), 'after')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(db.bags.put).toHaveBeenCalledWith(expect.objectContaining({
      consumeLogs: [expect.objectContaining({ id: 'selected', notes: 'after' })],
    })))
    expect(mockPush).toHaveBeenCalledWith(`/bags/${mockBag.id}/extraction/selected`)
  })

  it('returns to the selected extraction when editing is cancelled', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.get).mockResolvedValue({ ...mockBag, consumeLogs: [
      { id: 'selected', date: '2026-09-09', grams: 14, reducesStock: true },
    ] })
    render(<DetailPage bagId={mockBag.id} editLogId="selected" />)
    await screen.findByText('抽出記録を編集')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(db.bags.put).not.toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith(`/bags/${mockBag.id}/extraction/selected`)
  })

  it('keeps the editor open without changing stock when the amount exceeds available beans', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.get).mockResolvedValue({ ...mockBag, remaining_g: 10, consumeLogs: [
      { id: 'selected', date: '2026-09-09', grams: 14, reducesStock: true },
    ] })
    render(<DetailPage bagId={mockBag.id} editLogId="selected" />)
    await screen.findByText('抽出記録を編集')
    await user.clear(screen.getByLabelText(/豆量/))
    await user.type(screen.getByLabelText(/豆量/), '25')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByRole('alert')
    expect(db.bags.put).not.toHaveBeenCalled()
    expect(screen.getByText('抽出記録を編集')).toBeInTheDocument()
  })

  it('does not offer extraction or stock summaries for a subscription setting', async () => {
    jest.mocked(db.bags.get).mockResolvedValue({ ...mockBag, isSubscriptionTemplate: true })
    render(<DetailPage bagId={mockBag.id} />)
    await screen.findByText(mockBag.name)
    expect(screen.queryByRole('button', { name: '抽出を記録' })).not.toBeInTheDocument()
    expect(screen.queryByText('残量')).not.toBeInTheDocument()
  })

  it('confirms deletion from the bag detail and keeps the page on failure', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.get).mockResolvedValue(mockBag)
    jest.mocked(deleteBag).mockRejectedValue(new Error('storage unavailable'))
    render(<DetailPage bagId={mockBag.id} />)
    await screen.findByText(mockBag.name)
    await user.click(screen.getByRole('button', { name: '豆を削除' }))
    expect(deleteBag).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(deleteBag).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '豆を削除' }))
    await user.click(screen.getByRole('button', { name: '削除する' }))
    await screen.findByRole('alert')
    expect(mockPush).not.toHaveBeenCalled()
    jest.mocked(deleteBag).mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
  })
})
