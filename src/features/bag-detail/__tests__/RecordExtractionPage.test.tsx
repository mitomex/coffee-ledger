import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import RecordExtractionPage from '../RecordExtractionPage'
import { db } from '@/lib/db'
import { mockBag } from '../../../__tests__/utils/mock-data'
import { resolveDose } from '@/lib/utils/coffee'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    bags: {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockPush = jest.fn()
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('RecordExtractionPage', () => {
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

    render(<RecordExtractionPage bagId="bag-1" />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should show not found message when bag does not exist', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(undefined)

    render(<RecordExtractionPage bagId="missing" />)

    await waitFor(() => {
      expect(screen.getByText('コーヒー豆が見つかりません')).toBeInTheDocument()
    })
  })

  it('should preload default dose and render form fields', async () => {
    const mockGet = jest.mocked(db.bags.get)
    mockGet.mockResolvedValue(mockBag)

    render(<RecordExtractionPage bagId={mockBag.id} />)

    const doseInput = await screen.findByLabelText('豆量（g）') as HTMLInputElement
    const expectedDose = resolveDose(14, mockBag.roaster, mockBag.bagDose_g)
    expect(doseInput.value).toBe(String(expectedDose))
    expect(screen.getByLabelText('挽き目（任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('湯温（℃・任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('湯量（g・任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('メモ（任意）')).toBeInTheDocument()
    // 新しい抽出パラメータフィールド
    expect(screen.getByLabelText('ドリッパー（任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('グラインダー（任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('抽出時間（任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('抽出量（ml・任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('蒸らし時間（秒・任意）')).toBeInTheDocument()
    expect(screen.getByLabelText('評価（任意）')).toBeInTheDocument()
  })

  it('should save extraction log and navigate back to detail page', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(mockBag)
    mockPut.mockResolvedValue('updated-id')

    render(<RecordExtractionPage bagId={mockBag.id} />)

    const doseInput = await screen.findByLabelText('豆量（g）') as HTMLInputElement
    await user.clear(doseInput)
    await user.type(doseInput, '15')

    const grindSizeInput = screen.getByLabelText('挽き目（任意）') as HTMLInputElement
    await user.type(grindSizeInput, '中挽き')

    const waterTempInput = screen.getByLabelText('湯温（℃・任意）') as HTMLInputElement
    await user.type(waterTempInput, '92')

    const waterAmountInput = screen.getByLabelText('湯量（g・任意）') as HTMLInputElement
    await user.type(waterAmountInput, '200')

    const notesInput = screen.getByLabelText('メモ（任意）') as HTMLTextAreaElement
    await user.type(notesInput, 'Perfect extraction')

    const consumeCheckbox = screen.getByLabelText(/在庫も減らす/)
    await user.click(consumeCheckbox)

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          consumeLogs: expect.arrayContaining([
            expect.objectContaining({
              grams: 15,
              grindSize: '中挽き',
              waterTemp: 92,
              waterAmount: 200,
              notes: 'Perfect extraction',
              reducesStock: false,
            })
          ]),
          remaining_g: mockBag.remaining_g,
        })
      )
    })

    expect(mockPush).toHaveBeenCalledWith(`/bags/${mockBag.id}`)
  })

  it('should limit dose input to remaining_g when reducesStock is checked', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    const bagWithLowStock = { ...mockBag, remaining_g: 20 }
    mockGet.mockResolvedValue(bagWithLowStock)
    mockPut.mockResolvedValue('updated-id')

    render(<RecordExtractionPage bagId={mockBag.id} />)

    const doseInput = await screen.findByLabelText('豆量（g）') as HTMLInputElement
    await user.clear(doseInput)
    await user.type(doseInput, '50') // 残量20gを超える50gを入力

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          consumeLogs: expect.arrayContaining([
            expect.objectContaining({
              grams: 20, // 50gではなく残量の20gに制限される
              reducesStock: true,
            })
          ]),
          remaining_g: 0, // 残量が0になる
        })
      )
    })
  })

  it('should allow dose exceeding remaining_g when reducesStock is unchecked', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    const bagWithLowStock = { ...mockBag, remaining_g: 20 }
    mockGet.mockResolvedValue(bagWithLowStock)
    mockPut.mockResolvedValue('updated-id')

    render(<RecordExtractionPage bagId={mockBag.id} />)

    const doseInput = await screen.findByLabelText('豆量（g）') as HTMLInputElement
    await user.clear(doseInput)
    await user.type(doseInput, '50')

    // 「在庫も減らす」のチェックを外す
    const consumeCheckbox = screen.getByLabelText(/在庫も減らす/)
    await user.click(consumeCheckbox)

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          consumeLogs: expect.arrayContaining([
            expect.objectContaining({
              grams: 50, // チェックを外した場合は制限なし
              reducesStock: false,
            })
          ]),
          remaining_g: 20, // 残量は変わらない
        })
      )
    })
  })

  it('should save all extended extraction fields', async () => {
    const user = userEvent.setup()
    const mockGet = jest.mocked(db.bags.get)
    const mockPut = jest.mocked(db.bags.put)
    mockGet.mockResolvedValue(mockBag)
    mockPut.mockResolvedValue('updated-id')

    render(<RecordExtractionPage bagId={mockBag.id} />)

    await screen.findByLabelText('豆量（g）')

    // 新しいフィールドに入力
    const dripperInput = screen.getByLabelText('ドリッパー（任意）')
    await user.type(dripperInput, 'V60')

    const grinderInput = screen.getByLabelText('グラインダー（任意）')
    await user.type(grinderInput, 'Comandante C40')

    const brewTimeInput = screen.getByLabelText('抽出時間（任意）')
    await user.type(brewTimeInput, '2:30')

    const yieldInput = screen.getByLabelText('抽出量（ml・任意）')
    await user.type(yieldInput, '180')

    const bloomTimeInput = screen.getByLabelText('蒸らし時間（秒・任意）')
    await user.type(bloomTimeInput, '30')

    const ratingInput = screen.getByLabelText('評価（任意）')
    await user.type(ratingInput, '4')

    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          consumeLogs: expect.arrayContaining([
            expect.objectContaining({
              dripper: 'V60',
              grinder: 'Comandante C40',
              brewTime: '2:30',
              yieldAmount: 180,
              bloomTime: 30,
              rating: 4,
            })
          ]),
        })
      )
    })
  })
})


it.each([{ isSubscriptionTemplate: true }, { isSet: true }])('blocks direct extraction creation for non-stock objects: %o', async (flags) => {
  jest.mocked(db.bags.get).mockResolvedValue({ ...mockBag, ...flags })
  render(<RecordExtractionPage bagId={mockBag.id} />)
  await screen.findByText('抽出記録は個々の豆に追加できます。対象の豆を選んでください。')
  expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
})
