import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessModal } from '../success-modal';

describe('SuccessModal', () => {
  it('should not render when isOpen is false', () => {
    render(
      <SuccessModal
        isOpen={false}
        onClose={jest.fn()}
        title="成功"
        message="保存しました"
      />
    );

    expect(screen.queryByText('成功')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <SuccessModal
        isOpen={true}
        onClose={jest.fn()}
        title="成功"
        message="保存しました"
      />
    );

    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <SuccessModal
        isOpen={true}
        onClose={onClose}
        title="成功"
        message="保存しました"
      />
    );

    const closeButton = screen.getByRole('button', { name: 'OK' });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <SuccessModal
        isOpen={true}
        onClose={onClose}
        title="成功"
        message="保存しました"
      />
    );

    // モーダル背景をクリック（モーダルコンテンツ以外の部分）
    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <SuccessModal
        isOpen={true}
        onClose={onClose}
        title="成功"
        message="保存しました"
      />
    );

    const xButton = screen.getByLabelText('閉じる');
    await user.click(xButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should automatically close after autoCloseMs', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    render(
      <SuccessModal
        isOpen={true}
        onClose={onClose}
        title="成功"
        message="保存しました"
        autoCloseMs={1000}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    // 1000ms進める
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('should not auto-close if autoCloseMs is not provided', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    render(
      <SuccessModal
        isOpen={true}
        onClose={onClose}
        title="成功"
        message="保存しました"
      />
    );

    // 5000ms進める
    jest.advanceTimersByTime(5000);

    expect(onClose).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should use default texts when not provided', () => {
    render(
      <SuccessModal
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('操作が完了しました')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('should use custom buttonText when provided', () => {
    render(
      <SuccessModal
        isOpen={true}
        onClose={jest.fn()}
        buttonText="確認"
      />
    );

    expect(screen.getByRole('button', { name: '確認' })).toBeInTheDocument();
  });

  it('should use the default primary button instead of a green override', () => {
    render(
      <SuccessModal
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    const okButton = screen.getByRole('button', { name: 'OK' });
    expect(okButton).not.toHaveClass('bg-green-600');
    expect(okButton).toHaveClass('bg-primary');
  });

  it('should use foreground color for the success icon', () => {
    render(
      <SuccessModal
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    const icon = screen.getByRole('dialog').querySelector('svg');
    expect(icon).not.toHaveClass('text-green-600');
    expect(icon).toHaveClass('text-foreground');
  });
});
