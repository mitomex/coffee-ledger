import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteConfirmationModal } from '../delete-confirmation-modal'
import { SuccessModal } from '../success-modal'

function DeleteExample({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)}>豆を削除</button>
    <button>背景の操作</button>
    <DeleteConfirmationModal isOpen={open} onClose={() => setOpen(false)} onConfirm={jest.fn()} isLoading={busy} />
  </>
}

it('names and describes the dialog, focuses cancel, traps Tab, and restores focus after Escape', async () => {
  const user = userEvent.setup()
  render(<DeleteExample />)
  const trigger = screen.getByRole('button', { name: '豆を削除' })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: '削除の確認' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog).toHaveAccessibleDescription('本当に削除しますか？この操作は取り消せません。')
  expect(screen.getByRole('button', { name: 'キャンセル' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: '削除する' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: '閉じる' })).toHaveFocus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: '削除する' })).toHaveFocus()
  expect(screen.queryByRole('button', { name: '背景の操作' })).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(trigger).toHaveFocus()
})

it('keeps a busy deletion dialog open on Escape', async () => {
  const user = userEvent.setup()
  render(<DeleteExample busy />)
  await user.click(screen.getByRole('button', { name: '豆を削除' }))
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog', { name: '削除の確認' })).toHaveAttribute('aria-busy', 'true')
})

it('focuses the success confirmation action and provides its message as a description', () => {
  render(<SuccessModal isOpen onClose={jest.fn()} message="保存しました" />)
  expect(screen.getByRole('dialog', { name: '成功' })).toHaveAccessibleDescription('保存しました')
  expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus()
})
