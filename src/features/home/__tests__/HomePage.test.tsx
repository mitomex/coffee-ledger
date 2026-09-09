import { act, render, screen, waitFor, within } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import HomePage from '../HomePage'
import { db } from '@/lib/db'
import { mockBags } from '../../../__tests__/utils/mock-data'

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

const findInventoryHeading = () => screen.getByRole('heading', { level: 2, name: /在庫一覧/ })

describe('HomePage', () => {
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
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof db.bags.toArray>
    ) // Never resolves

    render(<HomePage />)
    
    const loaders = screen.getAllByText('読み込み中...')
    expect(loaders.length).toBeGreaterThan(0)
  })

  it('should show empty state when no bags exist', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([])

    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText(/まだ登録されたコーヒー豆がありません/)).toBeInTheDocument()
    })
    
    expect(screen.getByText('最初の豆を登録')).toBeInTheDocument()
  })

  it('should render bags when loaded', async () => {
    const activeBags = mockBags.filter(bag => bag.remaining_g > 0)
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(activeBags)

    render(<HomePage />)
    
    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    expect(findInventoryHeading()).toBeInTheDocument()
    const inventorySection = findInventoryHeading().closest('section')
    expect(inventorySection).toBeInTheDocument()
    const bagHeadings = within(inventorySection!).getAllByRole('heading', { level: 3 })
    expect(bagHeadings).toHaveLength(activeBags.length)
  })

  it('should focus on inventory without recommendations', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(mockBags)

    render(<HomePage />)

    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    expect(screen.queryByText('今日のおすすめ')).not.toBeInTheDocument()
  })

  it('should handle sort key changes', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(mockBags)

    render(<HomePage />)
    
    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    const sortSelect = screen.getByDisplayValue('日付（古い順）')
    await user.selectOptions(sortSelect, 'remain-desc')
    
    expect(sortSelect).toHaveValue('remain-desc')
  })

  it('should allow filtering bags by process in inventory', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    const bagsWithVariousProcesses = [
      {
        ...mockBags[0],
        id: 'washed-bag',
        name: 'Washed Coffee',
        process: 'Washed',
        remaining_g: 120,
      },
      {
        ...mockBags[1],
        id: 'natural-bag',
        name: 'Natural Coffee',
        process: 'Natural',
        remaining_g: 150,
      },
      {
        ...mockBags[0],
        id: 'honey-bag',
        name: 'Honey Coffee',
        process: 'Honey',
        remaining_g: 140,
      },
    ]
    mockToArray.mockResolvedValue(bagsWithVariousProcesses)

    render(<HomePage />)

    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    const filterSelect = screen.getByLabelText('プロセスで絞り込む')
    expect(filterSelect).toHaveValue('all')

    expect(screen.getByText('Washed Coffee')).toBeInTheDocument()
    expect(screen.getByText('Natural Coffee')).toBeInTheDocument()
    expect(screen.getByText('Honey Coffee')).toBeInTheDocument()

    await user.selectOptions(filterSelect, 'Natural')

    expect(screen.queryByText('Washed Coffee')).not.toBeInTheDocument()
    expect(screen.getByText('Natural Coffee')).toBeInTheDocument()
    expect(screen.queryByText('Honey Coffee')).not.toBeInTheDocument()

    await user.selectOptions(filterSelect, 'all')

    expect(screen.getByText('Washed Coffee')).toBeInTheDocument()
    expect(screen.getByText('Natural Coffee')).toBeInTheDocument()
    expect(screen.getByText('Honey Coffee')).toBeInTheDocument()
  })

  it('should lay out filter controls horizontally on small screens', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(mockBags)

    render(<HomePage />)

    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    const filterSelect = screen.getByLabelText('プロセスで絞り込む')
    const controlsContainer = filterSelect.parentElement as HTMLElement

    expect(controlsContainer.className).toContain('flex-row')
    expect(controlsContainer.className).not.toContain('flex-col')
  })

  it('should navigate to bag detail when bag is clicked', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([mockBags[0]])

    render(<HomePage />)

    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: new RegExp(mockBags[0].name) })
    expect(link).toHaveAttribute('href', `/bags/${mockBags[0].id}`)
    // A native link participates in the keyboard sequence without a custom click handler.
    for (let i = 0; i < 12 && document.activeElement !== link; i++) await user.tab()
    expect(link).toHaveFocus()

  })

  it('should navigate to new bag page when FAB is clicked', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(mockBags)

    render(<HomePage />)
    
    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    const fabButton = screen.getByRole('button', { name: /新規/ })
    await user.click(fabButton)
    
    expect(mockPush).toHaveBeenCalledWith('/bags/new')
  })

  it('should navigate to new bag page from empty state button', async () => {
    const user = userEvent.setup()
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([])

    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText(/まだ登録されたコーヒー豆がありません/)).toBeInTheDocument()
    })

    const registerButton = screen.getByText('最初の豆を登録')
    await user.click(registerButton)
    
    expect(mockPush).toHaveBeenCalledWith('/bags/new')
  })

  it('should display bag information correctly', async () => {
    const testBag = {
      ...mockBags[0],
      remaining_g: 150,
      variety: 'Heirloom'
    }
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([testBag])

    render(<HomePage />)

    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    // Check bag details are displayed in inventory section
    const inventorySection = findInventoryHeading().closest('section')
    expect(inventorySection).toBeInTheDocument()

    // Use getAllByText and check that the content exists
    expect(screen.getAllByText(testBag.roaster, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(testBag.variety!, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(testBag.process, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(`残 ${testBag.remaining_g}g`, { exact: false }).length).toBeGreaterThan(0)
  })

  it('should display "プロセス：未選択" when process is empty', async () => {
    const bagWithoutProcess = {
      ...mockBags[0],
      process: '',
      remaining_g: 100
    }
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue([bagWithoutProcess])

    render(<HomePage />)

    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    // Should display "プロセス：未選択"
    expect(screen.getByText(/プロセス：未選択/)).toBeInTheDocument()
  })

  it('should show history link', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(mockBags)

    render(<HomePage />)
    
    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    const historyLink = screen.getByRole('link', { name: '飲み切った豆' })
    expect(historyLink).toBeInTheDocument()
    expect(historyLink).toHaveAttribute('href', '/history')
  })

  it('should handle error state gracefully', async () => {
    const mockToArray = jest.mocked(db.bags.toArray)
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockToArray.mockRejectedValue(new Error('Database error'))

    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText(/まだ登録されたコーヒー豆がありません/)).toBeInTheDocument()
    })

    expect(consoleError).toHaveBeenCalledWith('Failed to load bags:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('should filter archived bags correctly', async () => {
    const bagsWithArchived = [
      ...mockBags,
      {
        ...mockBags[0],
        id: 'archived-bag',
        name: 'Archived Coffee',
        remaining_g: 0
      }
    ]
    
    const mockToArray = jest.mocked(db.bags.toArray)
    mockToArray.mockResolvedValue(bagsWithArchived)

    render(<HomePage />)
    
    await waitFor(() => {
      expect(findInventoryHeading()).toBeInTheDocument()
    })

    // Archived bag should not appear in the list
    expect(screen.queryByText('Archived Coffee')).not.toBeInTheDocument()
    
    // Should show count of non-archived bags only
    const activeBagsCount = bagsWithArchived.filter(bag =>
      bag.remaining_g > 0
    ).length
    const inventorySection = findInventoryHeading().closest('section')
    expect(inventorySection).toBeInTheDocument()
    const bagHeadings = within(inventorySection!).getAllByRole('heading', { level: 3 })
    expect(bagHeadings).toHaveLength(activeBagsCount)
  })

  describe('Parent Bag Display', () => {
    it('should display "セット" badge for parent bags', async () => {
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Parent Set',
        isSet: true,
        childBagIds: ['child-1'],
        remaining_g: 0,
        consumeLogs: [],
      }

      const childBag = {
        ...mockBags[1],
        id: 'child-1',
        name: 'Child Bag',
        parentBagId: 'parent-1',
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Parent Set')).toBeInTheDocument()
      })

      // Should display "セット" badge (both SP and PC versions)
      expect(screen.getAllByText('セット')).toHaveLength(2)
    })

    it('should not display variety and process for parent bags', async () => {
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Parent Set',
        roaster: 'Test Roaster',
        variety: 'Heirloom',
        process: 'Natural',
        isSet: true,
        childBagIds: ['child-1'],
        remaining_g: 0,
        consumeLogs: [],
      }

      const childBag = {
        ...mockBags[1],
        id: 'child-1',
        name: 'Child Bag',
        parentBagId: 'parent-1',
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Parent Set')).toBeInTheDocument()
      })

      // Should display roaster
      expect(screen.getByText(/Test Roaster/, { exact: false })).toBeInTheDocument()

      // Should NOT display variety "Heirloom" in parent bag info (only roaster and date)
      const parentSetCard = screen.getByText('Parent Set').closest('.cursor-pointer')
      expect(parentSetCard).toBeInTheDocument()
      const parentCardText = parentSetCard!.textContent || ''

      // Parent bag should have roaster but not variety/process in the info line
      expect(parentCardText).toContain('Test Roaster')
      // The info line should not contain " / Heirloom" or " / Natural"
      const roasterLine = within(parentSetCard as HTMLElement).getAllByText(/Test Roaster/, { exact: false })[0]
      expect(roasterLine.textContent).not.toMatch(/Test Roaster\s*\/\s*Heirloom/)
      expect(roasterLine.textContent).not.toMatch(/\/\s*Natural\s*\//)
    })

    it('should display child bag names for parent bags with children', async () => {
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Parent Set',
        isSet: true,
        childBagIds: ['child-1', 'child-2'],
        remaining_g: 0,
        consumeLogs: [],
      }

      const childBag1 = {
        ...mockBags[1],
        id: 'child-1',
        name: 'Ethiopia Natural',
        parentBagId: 'parent-1',
        consumeLogs: [],
      }

      const childBag2 = {
        ...mockBags[1],
        id: 'child-2',
        name: 'Colombia Washed',
        parentBagId: 'parent-1',
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag1, childBag2])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Parent Set')).toBeInTheDocument()
      })

      // Should display child bag names (with bullet points)
      expect(screen.getByText('Ethiopia Natural', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('Colombia Washed', { exact: false })).toBeInTheDocument()
    })

    it('should not display child bag names section when parent has no children', async () => {
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Empty Parent Set',
        isSet: true,
        childBagIds: [],
        remaining_g: 0,
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Empty Parent Set')).toBeInTheDocument()
      })

      // Should still display "セット" badge (both SP and PC versions)
      expect(screen.getAllByText('セット')).toHaveLength(2)
    })

    it('should display total remaining grams from child bags for parent bag', async () => {
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Parent Set',
        isSet: true,
        childBagIds: ['child-1', 'child-2'],
        remaining_g: 0,
        consumeLogs: [],
      }

      const childBag1 = {
        ...mockBags[1],
        id: 'child-1',
        name: 'Ethiopia Natural',
        parentBagId: 'parent-1',
        remaining_g: 150,
        consumeLogs: [],
      }

      const childBag2 = {
        ...mockBags[1],
        id: 'child-2',
        name: 'Colombia Washed',
        parentBagId: 'parent-1',
        remaining_g: 200,
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag1, childBag2])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Parent Set')).toBeInTheDocument()
      })

      // Should display total: 150 + 200 = 350g
      expect(screen.getByText(/残 350g/, { exact: false })).toBeInTheDocument()
    })

    it('should display "未設定" when parent bag has no children', async () => {
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Empty Parent Set',
        isSet: true,
        childBagIds: [],
        remaining_g: 0,
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Empty Parent Set')).toBeInTheDocument()
      })

      // Should display "未設定"
      expect(screen.getByText('未設定')).toBeInTheDocument()
    })
  })

  describe('Parent Bag Filtering', () => {
    it('should show parent bags and hide child bags by default', async () => {
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Parent Set',
        isSet: true,
        childBagIds: ['child-1'],
        remaining_g: 0, // 親Bagは在庫を持たない（子Bagで管理）
        consumeLogs: [],
      }

      const childBag = {
        ...mockBags[1],
        id: 'child-1',
        name: 'Child Bag',
        parentBagId: 'parent-1',
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Parent Set')).toBeInTheDocument()
        expect(screen.queryByText('Child Bag')).not.toBeInTheDocument()
      })
    })

    it('should show child bags when filter is enabled', async () => {
      const user = userEvent.setup()
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Parent Set',
        isSet: true,
        childBagIds: ['child-1'],
        remaining_g: 0,
        consumeLogs: [],
      }

      const childBag = {
        ...mockBags[1],
        id: 'child-1',
        name: 'Child Bag',
        parentBagId: 'parent-1',
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag])

      render(<HomePage />)

      // Wait for parent to be visible (ensures loading is complete)
      await waitFor(() => {
        expect(screen.getByText('Parent Set')).toBeInTheDocument()
      })

      // Initially child should be hidden
      expect(screen.queryByText('Child Bag')).not.toBeInTheDocument()

      // Enable child bag display
      const filterCheckbox = await screen.findByLabelText('セット内容も表示')
      await user.click(filterCheckbox)

      // Now child should be visible
      expect(screen.getByText('Child Bag')).toBeInTheDocument()
      expect(screen.getByText('Parent Set')).toBeInTheDocument()
    })

    it('should display normal bags regardless of filter state', async () => {
      const user = userEvent.setup()
      const normalBag = {
        ...mockBags[0],
        id: 'normal-1',
        name: 'Normal Bag',
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([normalBag])

      render(<HomePage />)

      // Normal bag should be visible by default
      await waitFor(() => {
        expect(screen.getByText('Normal Bag')).toBeInTheDocument()
      })

      // Normal bag should still be visible when filter is enabled
      const filterCheckbox = await screen.findByLabelText('セット内容も表示')
      await user.click(filterCheckbox)

      expect(screen.getByText('Normal Bag')).toBeInTheDocument()
    })

    it('should display parent name for child bags when filter is enabled', async () => {
      const user = userEvent.setup()
      const parentBag = {
        ...mockBags[0],
        id: 'parent-1',
        name: 'Coffee Set A',
        isSet: true,
        childBagIds: ['child-1'],
        remaining_g: 0,
        consumeLogs: [],
      }

      const childBag = {
        ...mockBags[1],
        id: 'child-1',
        name: 'Ethiopia Yirgacheffe',
        parentBagId: 'parent-1',
        remaining_g: 150,
        consumeLogs: [],
      }

      jest.mocked(db.bags.toArray).mockResolvedValue([parentBag, childBag])

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Coffee Set A')).toBeInTheDocument()
      })

      // Enable child bag display
      const filterCheckbox = await screen.findByLabelText('セット内容も表示')
      await user.click(filterCheckbox)

      // Child bag should be visible
      expect(screen.getByText('Ethiopia Yirgacheffe')).toBeInTheDocument()

      // Child bag should show parent name
      expect(screen.getByText(/Coffee Set A のセット内容/)).toBeInTheDocument()
    })
  })
})


it('separates subscription settings from stock even when no stock remains', async () => {
  jest.mocked(db.bags.toArray).mockResolvedValue([{
    ...mockBags[0], id: 'template', name: '毎月の設定', isSubscriptionTemplate: true, remaining_g: 200,
  }])
  render(<HomePage />)
  await screen.findByRole('heading', { name: '定期購入設定' })
  expect(screen.getByRole('link', { name: /毎月の設定/ })).toHaveAttribute('href', '/bags/template')
  expect(screen.queryByText(/総グラム数 200g/)).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: '飲み切った豆' })).toHaveAttribute('href', '/history')
})


it('refreshes stock after recurring purchases have been created', async () => {
  jest.mocked(db.bags.toArray).mockResolvedValue([])
  render(<HomePage />)
  await screen.findByText('最初の豆を登録')
  jest.mocked(db.bags.toArray).mockResolvedValue([mockBags[0]])
  act(() => { window.dispatchEvent(new Event('coffee-ledger:subscriptions-updated')) })
  await screen.findByRole('heading', { name: mockBags[0].name })
})


it('provides a named filter dialog and restores focus to its trigger', async () => {
  const user = userEvent.setup()
  jest.mocked(db.bags.toArray).mockResolvedValue([mockBags[0]])
  render(<HomePage />)
  const trigger = await screen.findByRole('button', { name: 'フィルター' })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'フィルター' })
  expect(within(dialog).getByRole('combobox', { name: '並び順' })).toBeInTheDocument()
  await user.keyboard('{Escape}')
  await waitFor(() => expect(trigger).toHaveFocus())
})
