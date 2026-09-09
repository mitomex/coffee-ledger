import { render, screen, waitFor } from '../../../__tests__/utils/test-utils'
import { useRouter } from 'next/navigation'
import DetailPage from '../DetailPage'
import { db } from '@/lib/db'
import { mockBag } from '../../../__tests__/utils/mock-data'

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/delete-bag', () => ({ deleteBag: jest.fn() }))
jest.mock('@/lib/db', () => ({ db: { bags: { get: jest.fn(), put: jest.fn(), delete: jest.fn() } } }))
jest.mock('@/lib/utils/image', () => ({ getValidImageUrl: jest.fn(async () => 'default-image.jpg') }))

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

const twoLogBag = {
  ...mockBag,
  consumeLogs: [
    { id: 'log-1', date: '2025-09-08', grams: 14, reducesStock: true },
    { id: 'log-2', date: '2025-09-09', grams: 18, reducesStock: true },
  ],
}

describe('DetailPage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.mockReturnValue({
      push: jest.fn(), back: jest.fn(), forward: jest.fn(),
      refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it('describes the bag photo by the bag it shows', async () => {
    jest.mocked(db.bags.get).mockResolvedValue(mockBag)
    render(<DetailPage bagId={mockBag.id} />)
    await screen.findByRole('heading', { level: 1, name: mockBag.name })
    expect(screen.getByRole('img', { name: `${mockBag.name}の画像` })).toBeInTheDocument()
  })

  it('nests the consumption history heading directly under the page heading', async () => {
    jest.mocked(db.bags.get).mockResolvedValue(mockBag)
    render(<DetailPage bagId={mockBag.id} />)
    await waitFor(() => expect(screen.getByText('消費履歴')).toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 2, name: '消費履歴' })).toBeInTheDocument()
  })

  it('tells the record buttons apart by the record they act on', async () => {
    jest.mocked(db.bags.get).mockResolvedValue(twoLogBag)
    render(<DetailPage bagId={twoLogBag.id} />)
    await waitFor(() => expect(screen.getByText('消費履歴')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '2025/09/08 14gの抽出記録を編集' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2025/09/09 18gの抽出記録を削除' })).toBeInTheDocument()
  })
})
