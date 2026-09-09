import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import NewBagPage from '../NewBagPage'
import { db } from '@/lib/db'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    bags: {
      add: jest.fn(),
    },
  },
}))

// Mock image utils
jest.mock('@/lib/utils/image', () => ({
  getDefaultImageUrl: jest.fn(() => 'default-image.jpg'),
}))

const mockPush = jest.fn()
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('NewBagPage', () => {
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

  it('should render new bag form', () => {
    render(<NewBagPage />)
    
    expect(screen.getByText('新規登録')).toBeInTheDocument()
    expect(screen.getByLabelText('名前')).toBeInTheDocument()
    expect(screen.getByLabelText('ロースター')).toBeInTheDocument()
    expect(screen.getByLabelText('購入日（必須）')).toBeInTheDocument()
    expect(screen.getByLabelText('袋重量（g・必須）')).toBeInTheDocument()
  })

  it('should display site wordmark with unified styling', () => {
    render(<NewBagPage />)

    const wordmark = screen.getByText('Coffee Ledger')
    expect(wordmark).toHaveClass('tracking-tight text-lg sm:text-xl font-semibold')
  })

  it('should show missing required fields', async () => {
    render(<NewBagPage />)
    
    expect(screen.getByText('購入日')).toBeInTheDocument()
    expect(screen.getByText('袋重量')).toBeInTheDocument()
  })

  it('should update missing fields when form is filled', async () => {
    const user = userEvent.setup()
    render(<NewBagPage />)
    
    // Fill required fields
    const purchaseDateInput = screen.getByLabelText('購入日（必須）')
    const bagWeightInput = screen.getByLabelText('袋重量（g・必須）')
    
    await user.type(purchaseDateInput, '2025-09-08')
    await user.type(bagWeightInput, '200')
    
    await waitFor(() => {
      expect(screen.getByText('なし')).toBeInTheDocument()
    })
  })

  it('should enable save button when all required fields are filled', async () => {
    const user = userEvent.setup()
    render(<NewBagPage />)
    
    const saveButton = screen.getByRole('button', { name: /保存/ })
    expect(saveButton).toBeDisabled()
    
    // Fill required fields
    await user.type(screen.getByLabelText('購入日（必須）'), '2025-09-08')
    await user.type(screen.getByLabelText('袋重量（g・必須）'), '200')
    
    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })
  })

  it('should save bag when save button is clicked', async () => {
    const user = userEvent.setup()
    const mockAdd = jest.mocked(db.bags.add)
    mockAdd.mockResolvedValue('bag-123')

    render(<NewBagPage />)

    // Fill form
    await user.type(screen.getByLabelText('名前'), 'Test Coffee')
    await user.type(screen.getByLabelText('ロースター'), 'Test Roaster')
    await user.type(screen.getByLabelText('購入日（必須）'), '2025-09-08')
    await user.type(screen.getByLabelText('袋重量（g・必須）'), '200')

    const saveButton = screen.getByRole('button', { name: /保存/ })
    await user.click(saveButton)

    // Should save to database
    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Coffee',
          roaster: 'Test Roaster',
          bagWeight_g: 200,
          remaining_g: 200,
          purchaseDate: '2025-09-08',
        })
      )
    })

    // Should show success modal
    await waitFor(() => {
      expect(screen.getByText('保存完了')).toBeInTheDocument()
      expect(screen.getByText('コーヒー豆を登録しました')).toBeInTheDocument()
    })
  })

  it('should navigate to bag detail page after closing success modal', async () => {
    const user = userEvent.setup()
    const mockAdd = jest.mocked(db.bags.add)
    let savedBagId = ''
    mockAdd.mockImplementation((bag) => {
      savedBagId = bag.id
      return Promise.resolve(bag.id) as ReturnType<typeof db.bags.add>
    })

    render(<NewBagPage />)

    // Fill form and save
    await user.type(screen.getByLabelText('名前'), 'Test Coffee')
    await user.type(screen.getByLabelText('ロースター'), 'Test Roaster')
    await user.type(screen.getByLabelText('購入日（必須）'), '2025-09-08')
    await user.type(screen.getByLabelText('袋重量（g・必須）'), '200')

    const saveButton = screen.getByRole('button', { name: /保存/ })
    await user.click(saveButton)

    // Wait for modal to appear
    const okButton = await screen.findByRole('button', { name: 'OK' })
    expect(screen.getByText('保存完了')).toBeInTheDocument()

    // Click OK button to close modal
    await user.click(okButton)

    // Should navigate to bag detail page with the generated bag ID
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })
    expect(mockPush).toHaveBeenCalledWith(`/bags/${savedBagId}`)
  })

  it('should navigate back when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<NewBagPage />)
    
    const backButton = screen.getByRole('button', { name: /戻る/ })
    await user.click(backButton)
    
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('should handle custom process input', async () => {
    const user = userEvent.setup()
    render(<NewBagPage />)
    
    const processSelect = screen.getByLabelText('プロセス')
    await user.selectOptions(processSelect, 'custom')
    
    // Should show custom input
    expect(screen.getByPlaceholderText('プロセス名を入力')).toBeInTheDocument()
    
    // Should show back button (find the one that's not the navigation back button)
    const backButtons = screen.getAllByRole('button', { name: /戻る/ })
    expect(backButtons.length).toBeGreaterThan(1)
    
    // Click the process back button (second one)
    await user.click(backButtons[1])
    
    // Should hide custom input and show select again
    expect(screen.queryByPlaceholderText('プロセス名を入力')).not.toBeInTheDocument()
    expect(screen.getByLabelText('プロセス')).toBeInTheDocument()
  })

  it('should handle variety field input', async () => {
    const user = userEvent.setup()
    render(<NewBagPage />)

    const varietyInput = screen.getByLabelText('品種（Variety・任意）')
    await user.type(varietyInput, 'Geisha')

    expect(varietyInput).toHaveValue('Geisha')
  })

  describe('Set Product Features', () => {
    it('should show set product checkbox', () => {
      render(<NewBagPage />)

      expect(screen.getByLabelText('セット商品')).toBeInTheDocument()
    })

    it('should show set-specific fields when checkbox is checked', async () => {
      const user = userEvent.setup()
      render(<NewBagPage />)

      const setCheckbox = screen.getByLabelText('セット商品')
      await user.click(setCheckbox)

      expect(screen.getByLabelText('セット価格（¥・必須）')).toBeInTheDocument()
      expect(screen.queryByLabelText('袋重量（g・必須）')).not.toBeInTheDocument()
    })

    it('should hide normal bagWeight field when set product is checked', async () => {
      const user = userEvent.setup()
      render(<NewBagPage />)

      // Initially bagWeight should be visible
      expect(screen.getByLabelText('袋重量（g・必須）')).toBeInTheDocument()

      const setCheckbox = screen.getByLabelText('セット商品')
      await user.click(setCheckbox)

      // After checking, bagWeight should be hidden
      expect(screen.queryByLabelText('袋重量（g・必須）')).not.toBeInTheDocument()
      expect(screen.getByLabelText('セット価格（¥・必須）')).toBeInTheDocument()
    })

    it('should save parent bag when set product is checked', async () => {
      const user = userEvent.setup()
      const mockAdd = jest.mocked(db.bags.add)
      mockAdd.mockResolvedValue('parent-123')

      render(<NewBagPage />)

      await user.click(screen.getByLabelText('セット商品'))
      await user.type(screen.getByLabelText('名前'), 'Test Set')
      await user.type(screen.getByLabelText('ロースター'), 'Test Roaster')
      await user.type(screen.getByLabelText('購入日（必須）'), '2025-09-01')
      await user.type(screen.getByLabelText('セット価格（¥・必須）'), '6000')

      const saveButton = screen.getByRole('button', { name: /保存/ })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            isSet: true,
            childBagIds: [],
            remaining_g: 0,
            setInfo: expect.objectContaining({
              totalPriceJPY: 6000,
            }),
          })
        )
      })

      // Should show success modal
      await waitFor(() => {
        expect(screen.getByText('保存完了')).toBeInTheDocument()
        expect(screen.getByText('コーヒー豆を登録しました')).toBeInTheDocument()
      })
    })

    it('should validate set-specific fields when set product is checked', async () => {
      const user = userEvent.setup()
      render(<NewBagPage />)

      await user.click(screen.getByLabelText('セット商品'))
      await user.type(screen.getByLabelText('購入日（必須）'), '2025-09-01')

      // Should show missing set price
      await waitFor(() => {
        expect(screen.getByText('セット価格')).toBeInTheDocument()
      })
    })

    it('should hide unnecessary fields when set product checkbox is checked', async () => {
      const user = userEvent.setup()
      render(<NewBagPage />)

      // Initially, all fields should be visible
      expect(screen.getByLabelText('焙煎日（任意・到着後に入力）')).toBeInTheDocument()
      expect(screen.getByLabelText('プロセス')).toBeInTheDocument()
      expect(screen.getByLabelText('品種（Variety・任意）')).toBeInTheDocument()
      expect(screen.getByLabelText('この袋の1杯量（g・任意）')).toBeInTheDocument()
      expect(screen.getByText('価格（¥・任意）')).toBeInTheDocument()

      // Check the "セット商品" checkbox
      const setCheckbox = screen.getByLabelText('セット商品')
      await user.click(setCheckbox)

      // Fields should be hidden
      expect(screen.queryByLabelText('焙煎日（任意・到着後に入力）')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('プロセス')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('品種（Variety・任意）')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('この袋の1杯量（g・任意）')).not.toBeInTheDocument()
      expect(screen.queryByText('価格（¥・任意）')).not.toBeInTheDocument()

      // These fields should still be visible
      expect(screen.getByLabelText('名前')).toBeInTheDocument()
      expect(screen.getByLabelText('ロースター')).toBeInTheDocument()
      expect(screen.getByLabelText('購入日（必須）')).toBeInTheDocument()
      expect(screen.getByLabelText('セット価格（¥・必須）')).toBeInTheDocument()
    })

    it('should show fields again when set product checkbox is unchecked', async () => {
      const user = userEvent.setup()
      render(<NewBagPage />)

      // Check and uncheck the checkbox
      const setCheckbox = screen.getByLabelText('セット商品')
      await user.click(setCheckbox)
      await user.click(setCheckbox)

      // Fields should be visible again
      expect(screen.getByLabelText('焙煎日（任意・到着後に入力）')).toBeInTheDocument()
      expect(screen.getByLabelText('プロセス')).toBeInTheDocument()
      expect(screen.getByLabelText('品種（Variety・任意）')).toBeInTheDocument()
      expect(screen.getByLabelText('この袋の1杯量（g・任意）')).toBeInTheDocument()
      expect(screen.getByText('価格（¥・任意）')).toBeInTheDocument()

      // Set-specific fields should be hidden
      expect(screen.queryByLabelText('セット価格（¥・必須）')).not.toBeInTheDocument()
    })
  })
})


it('labels optional fields and announces missing required fields', async () => {
  const user = userEvent.setup()
  render(<NewBagPage />)
  expect(screen.getByLabelText('メモ（フレーバーなど）')).toBeInTheDocument()
  expect(screen.getByLabelText('購入日（必須）')).toBeRequired()
  expect(screen.getByLabelText('袋重量（g・必須）')).toHaveAccessibleDescription(expect.stringContaining('必須未入力'))
  expect(screen.getByRole('status')).toHaveTextContent('必須未入力')
  await user.selectOptions(screen.getByLabelText('プロセス'), 'custom')
  expect(screen.getByRole('textbox', { name: 'プロセス' })).toBeInTheDocument()
})
