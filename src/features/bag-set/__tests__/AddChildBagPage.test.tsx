import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import AddChildBagPage from '../AddChildBagPage'
import { db } from '@/lib/db'
import { mockBag } from '../../../__tests__/utils/mock-data'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    bags: {
      get: jest.fn(),
      add: jest.fn(),
      put: jest.fn(),
    },
  },
}))

describe('AddChildBagPage', () => {
  const mockPush = jest.fn()
  const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

  const parentBag = {
    ...mockBag,
    id: 'parent-1',
    name: 'セット親',
    isSet: true,
    childBagIds: [],
    setInfo: {
      totalPriceJPY: 6000,
      purchaseDate: '2025-09-01',
      totalWeight_g: 600,
    },
    remaining_g: 0,
  }

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

  it('shows parent information and set helper text', async () => {
    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<AddChildBagPage parentId="parent-1" />)

    await screen.findByText(/セット親/)

    expect(screen.getByText(/親セット/)).toBeInTheDocument()
    expect(screen.getByText('セット内容を追加')).toBeInTheDocument()
  })

  it('saves child bag and updates parent links', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.get)
      .mockResolvedValueOnce(parentBag) // initial load
      .mockResolvedValueOnce(parentBag) // maybe for subsequent effect (parent fetch after save?)

    render(<AddChildBagPage parentId="parent-1" />)

    await screen.findByText(/セット親/)

    await user.type(screen.getByLabelText('名前'), '子バッグA')
    await user.type(screen.getByLabelText('ロースター'), 'ロースターA')
    await user.type(screen.getByLabelText('袋重量（g・必須）'), '150')
    await user.type(screen.getByLabelText('価格（¥・任意）'), '2000')

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(db.bags.add).toHaveBeenCalledWith(
        expect.objectContaining({
          parentBagId: 'parent-1',
          name: '子バッグA',
        })
      )
    })

    expect(db.bags.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'parent-1',
        childBagIds: expect.arrayContaining([
          expect.any(String),
        ]),
        remaining_g: 0,
      })
    )

    // 成功モーダルが表示される
    await waitFor(() => {
      expect(screen.getByText('保存完了')).toBeInTheDocument()
    })
    expect(screen.getByText('セット内容を登録しました')).toBeInTheDocument()

    // モーダルを閉じると親詳細ページへ遷移
    const closeButton = screen.getByRole('button', { name: '閉じる' })
    await user.click(closeButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/bags/parent-1')
    })
  })

  it('applies equalized price suggestion', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.get).mockResolvedValue({
      ...parentBag,
      childBagIds: ['child-1'],
    })

    render(<AddChildBagPage parentId="parent-1" />)

    await screen.findByText(/セット親/)

    const equalizeButton = screen.getByRole('button', { name: '均等割' })
    await user.click(equalizeButton)

    const priceInput = screen.getByLabelText('価格（¥・任意）') as HTMLInputElement
    expect(priceInput.value).not.toBe('')
  })

  it('allows toggling to custom process input', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<AddChildBagPage parentId="parent-1" />)

    await screen.findByText(/セット親/)

    const processSelect = screen.getByLabelText('プロセス') as HTMLSelectElement
    await user.selectOptions(processSelect, 'custom')

    const customInput = await screen.findByPlaceholderText('プロセス名を入力')
    expect(customInput).toBeInTheDocument()

    const processButtons = screen.getAllByRole('button', { name: '戻る' })
    expect(processButtons.length).toBeGreaterThan(1)

    await user.click(processButtons[1])

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('プロセス名を入力')).not.toBeInTheDocument()
    })
    expect(screen.getByLabelText('プロセス')).toBeInTheDocument()
  })

  it('prefills custom process input when parent has unique process', async () => {
    jest.mocked(db.bags.get).mockResolvedValue({
      ...parentBag,
      process: 'Semi-Washed',
    })

    render(<AddChildBagPage parentId="parent-unique" />)

    const customInput = await screen.findByPlaceholderText('プロセス名を入力') as HTMLInputElement
    expect(customInput.value).toBe('Semi-Washed')
  })

  it('includes farm and country fields in the form', async () => {
    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<AddChildBagPage parentId="parent-1" />)

    await screen.findByText(/セット親/)

    expect(screen.getByLabelText('農園（任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('生産国（任意）')).toBeInTheDocument()
  })

  it('saves child bag with farm and country fields', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.get).mockResolvedValue(parentBag)

    render(<AddChildBagPage parentId="parent-1" />)

    await screen.findByText(/セット親/)

    await user.type(screen.getByLabelText('名前'), '子バッグB')
    await user.type(screen.getByLabelText('ロースター'), 'ロースターB')
    await user.type(screen.getByLabelText('袋重量（g・必須）'), '200')
    await user.type(screen.getByLabelText('農園（任意）'), 'コンガ農園')
    await user.type(screen.getByLabelText('生産国（任意）'), 'エチオピア')

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(db.bags.add).toHaveBeenCalledWith(
        expect.objectContaining({
          parentBagId: 'parent-1',
          name: '子バッグB',
          farm: 'コンガ農園',
          country: 'エチオピア',
        })
      )
    })
  })
})
