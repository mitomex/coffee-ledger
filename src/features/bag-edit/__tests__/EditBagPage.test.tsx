import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import EditBagPage from '../EditBagPage'
import { deleteBag } from '@/lib/delete-bag'
import { db } from '@/lib/db'
import { mockBag } from '../../../__tests__/utils/mock-data'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

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

describe('EditBagPage', () => {
  const mockPush = jest.fn()
  const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

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

  it('loads bag and displays form', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<EditBagPage bagId={mockBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue(mockBag.name)).toBeInTheDocument()
  })

  it('shows unified site wordmark styling', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<EditBagPage bagId={mockBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('Coffee Ledger')).toBeInTheDocument()
    })

    const wordmark = screen.getByText('Coffee Ledger')
    expect(wordmark).toHaveClass('tracking-tight text-lg sm:text-xl font-semibold')
  })

  it('saves updates and shows success modal', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(mockBag)
    mockPut.mockResolvedValue('updated')

    render(<EditBagPage bagId={mockBag.id} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockBag.name)).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue(mockBag.name)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    // Should show success modal
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled()
      expect(screen.getByText('保存完了')).toBeInTheDocument()
      expect(screen.getByText('コーヒー豆の情報を更新しました')).toBeInTheDocument()
    })
  })

  it('navigates back to detail page after closing success modal', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(mockBag)
    mockPut.mockResolvedValue('updated')

    render(<EditBagPage bagId={mockBag.id} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockBag.name)).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue(mockBag.name)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    // Wait for modal to appear
    const okButton = await screen.findByRole('button', { name: 'OK' })
    expect(screen.getByText('保存完了')).toBeInTheDocument()

    // Click OK button to close modal
    await user.click(okButton)

    // Should navigate back to detail page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/bags/${mockBag.id}`)
    })
  })

  it('deletes bag after confirmation and navigates home', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockDelete = jest.mocked(deleteBag)
    mockGet.mockResolvedValue(mockBag)
    mockDelete.mockResolvedValue(undefined)

    render(<EditBagPage bagId={mockBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: '削除' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('豆の削除')).toBeInTheDocument()
    })

    const confirm = screen.getByRole('button', { name: '削除する' })
    await user.click(confirm)

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(mockBag.id)
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('can convert existing bag to set product', async () => {
    const user = userEvent.setup()
    const normalBag = {
      ...mockBag,
      isSet: undefined,
      childBagIds: undefined,
    }
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(normalBag)
    mockPut.mockResolvedValue('updated')

    render(<EditBagPage bagId={normalBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Check the "セット商品として登録" checkbox
    const setCheckbox = screen.getByLabelText('セット商品として登録')
    expect(setCheckbox).not.toBeChecked()
    await user.click(setCheckbox)
    expect(setCheckbox).toBeChecked()

    // Save the form
    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          id: normalBag.id,
          isSet: true,
          childBagIds: [],
          remaining_g: 0,
        })
      )
    })
  })

  it('can revert set product to normal bag', async () => {
    const user = userEvent.setup()
    const setBag = {
      ...mockBag,
      isSet: true,
      childBagIds: [],
      remaining_g: 0,
    }
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(setBag)
    mockPut.mockResolvedValue('updated')

    render(<EditBagPage bagId={setBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Uncheck the "セット商品として登録" checkbox
    const setCheckbox = screen.getByLabelText('セット商品として登録')
    expect(setCheckbox).toBeChecked()
    await user.click(setCheckbox)
    expect(setCheckbox).not.toBeChecked()

    // Save the form
    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          id: setBag.id,
          isSet: false,
        })
      )
    })
  })

  it('should hide unnecessary fields when set product checkbox is checked', async () => {
    const user = userEvent.setup()
    const normalBag = {
      ...mockBag,
      isSet: false,
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(normalBag)

    render(<EditBagPage bagId={normalBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Initially, all fields should be visible
    expect(screen.getByLabelText('焙煎日（任意・到着後に入力）')).toBeInTheDocument()
    expect(screen.getByLabelText('プロセス')).toBeInTheDocument()
    expect(screen.getByLabelText('品種（Variety・任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('この袋の1杯量（g・任意）')).toBeInTheDocument()
    expect(screen.getByText('価格（¥・任意）')).toBeInTheDocument()
    expect(screen.getByText('袋重量（g・必須）')).toBeInTheDocument()
    expect(screen.getByText('現在の残量（g・任意）')).toBeInTheDocument()

    // Check the "セット商品として登録" checkbox
    const setCheckbox = screen.getByLabelText('セット商品として登録')
    await user.click(setCheckbox)

    // Fields should be hidden
    expect(screen.queryByLabelText('焙煎日（任意・到着後に入力）')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('プロセス')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('品種（Variety・任意）')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('この袋の1杯量（g・任意）')).not.toBeInTheDocument()
    expect(screen.queryByText('価格（¥・任意）')).not.toBeInTheDocument()
    expect(screen.queryByText('袋重量（g・必須）')).not.toBeInTheDocument()
    expect(screen.queryByText('現在の残量（g・任意）')).not.toBeInTheDocument()
  })

  it('should show fields again when set product checkbox is unchecked in edit', async () => {
    const user = userEvent.setup()
    const setBag = {
      ...mockBag,
      isSet: true,
      childBagIds: [],
      remaining_g: 0,
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(setBag)

    render(<EditBagPage bagId={setBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Initially, fields should be hidden (set product is checked)
    expect(screen.queryByLabelText('焙煎日（任意・到着後に入力）')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('プロセス')).not.toBeInTheDocument()
    expect(screen.queryByText('価格（¥・任意）')).not.toBeInTheDocument()
    expect(screen.queryByText('袋重量（g・必須）')).not.toBeInTheDocument()
    expect(screen.queryByText('現在の残量（g・任意）')).not.toBeInTheDocument()

    // Uncheck the checkbox
    const setCheckbox = screen.getByLabelText('セット商品として登録')
    await user.click(setCheckbox)

    // Fields should be visible again
    expect(screen.getByLabelText('焙煎日（任意・到着後に入力）')).toBeInTheDocument()
    expect(screen.getByLabelText('プロセス')).toBeInTheDocument()
    expect(screen.getByLabelText('品種（Variety・任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('この袋の1杯量（g・任意）')).toBeInTheDocument()
    expect(screen.getByText('価格（¥・任意）')).toBeInTheDocument()
    expect(screen.getByText('袋重量（g・必須）')).toBeInTheDocument()
    expect(screen.getByText('現在の残量（g・任意）')).toBeInTheDocument()
  })

  it('should display set price field when editing set product', async () => {
    const setBag = {
      ...mockBag,
      isSet: true,
      childBagIds: [],
      remaining_g: 0,
      setInfo: {
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
      },
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(setBag)

    render(<EditBagPage bagId={setBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Should display set price field
    expect(screen.getByLabelText('セット価格（¥・必須）')).toBeInTheDocument()
    expect(screen.getByDisplayValue('6000')).toBeInTheDocument()
  })

  it('should save updated set price when editing set product', async () => {
    const user = userEvent.setup()
    const setBag = {
      ...mockBag,
      isSet: true,
      childBagIds: [],
      remaining_g: 0,
      setInfo: {
        totalPriceJPY: 6000,
        purchaseDate: '2025-09-01',
      },
    }
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(setBag)
    mockPut.mockResolvedValue('updated')

    render(<EditBagPage bagId={setBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Update set price
    const priceInput = screen.getByLabelText('セット価格（¥・必須）')
    await user.clear(priceInput)
    await user.type(priceInput, '7000')

    // Save
    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          setInfo: expect.objectContaining({
            totalPriceJPY: 7000,
          }),
        })
      )
    })
  })

  it('should display farm and country input fields', async () => {
    const bagWithLocation = {
      ...mockBag,
      farm: 'コンガ農園',
      country: 'エチオピア',
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(bagWithLocation)

    render(<EditBagPage bagId={bagWithLocation.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Farm and country fields should be visible
    expect(screen.getByLabelText('農園（任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('生産国（任意）')).toBeInTheDocument()
    expect(screen.getByDisplayValue('コンガ農園')).toBeInTheDocument()
    expect(screen.getByDisplayValue('エチオピア')).toBeInTheDocument()
  })

  it('should save farm and country when updating bag', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(mockBag)
    mockPut.mockResolvedValue('updated')

    render(<EditBagPage bagId={mockBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Fill in farm and country fields
    const farmInput = screen.getByLabelText('農園（任意）')
    const countryInput = screen.getByLabelText('生産国（任意）')

    await user.type(farmInput, 'コンガ農園')
    await user.type(countryInput, 'エチオピア')

    // Save
    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          farm: 'コンガ農園',
          country: 'エチオピア',
        })
      )
    })
  })

  it('should hide farm and country fields when set product checkbox is checked', async () => {
    const user = userEvent.setup()
    const normalBag = {
      ...mockBag,
      isSet: false,
    }
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(normalBag)

    render(<EditBagPage bagId={normalBag.id} />)

    await waitFor(() => {
      expect(screen.getByText('豆の情報を編集')).toBeInTheDocument()
    })

    // Initially, farm and country fields should be visible
    expect(screen.getByLabelText('農園（任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('生産国（任意）')).toBeInTheDocument()

    // Check the "セット商品として登録" checkbox
    const setCheckbox = screen.getByLabelText('セット商品として登録')
    await user.click(setCheckbox)

    // Farm and country fields should be hidden
    expect(screen.queryByLabelText('農園（任意）')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('生産国（任意）')).not.toBeInTheDocument()
  })

})



it('gives every editable field a programmatic label', async () => {
  jest.mocked(db.bags.get).mockResolvedValue(mockBag)
  const { container } = render(<EditBagPage bagId={mockBag.id} />)
  await screen.findByText('豆の情報を編集')
  for (const field of container.querySelectorAll('input, select, textarea')) {
    expect(field).toHaveAccessibleName()
  }
})


it('keeps the process label when switching to free text', async () => {
  const user = userEvent.setup()
  jest.mocked(db.bags.get).mockResolvedValue(mockBag)
  render(<EditBagPage bagId={mockBag.id} />)
  await screen.findByText('豆の情報を編集')
  await user.selectOptions(screen.getByLabelText('プロセス'), 'custom')
  expect(screen.getByRole('textbox', { name: 'プロセス' })).toBeInTheDocument()
})
