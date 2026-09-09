import { render, screen } from '../../../__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import HomePage from '../HomePage'
import { db } from '@/lib/db'
import { mockBags } from '../../../__tests__/utils/mock-data'

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/db', () => ({ db: { bags: { toArray: jest.fn() } } }))
jest.mock('@/lib/utils/image', () => ({ getValidImageUrl: jest.fn(async () => 'default-image.jpg') }))

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('HomePage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.mockReturnValue({
      push: jest.fn(), back: jest.fn(), forward: jest.fn(),
      refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it('announces how many bags a filter leaves behind', async () => {
    const user = userEvent.setup()
    jest.mocked(db.bags.toArray).mockResolvedValue(mockBags)
    render(<HomePage />)

    const summary = await screen.findByRole('status', { name: '在庫の集計' })
    expect(summary).toHaveTextContent('総件数 2件')

    await user.selectOptions(screen.getByRole('combobox', { name: 'プロセスで絞り込む' }), 'Natural')
    expect(summary).toHaveTextContent('総件数 1件')
  })
})
