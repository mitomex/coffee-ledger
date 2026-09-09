'use client';

import React, { useRef } from 'react';
import { Modal, ModalTitle, ModalDescription } from './modal';
import { Button } from './button';
import { X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  errorMessage?: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = '削除の確認',
  message = '本当に削除しますか？この操作は取り消せません。',
  confirmText = '削除する',
  cancelText = 'キャンセル',
  isLoading = false,
  errorMessage,
}: DeleteConfirmationModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal open={isOpen} onClose={onClose} busy={isLoading} hasDescription initialFocusRef={cancelRef}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/70">
          <ModalTitle className="text-base font-semibold tracking-[0.08em] text-foreground">
            {title}
          </ModalTitle>
          {!isLoading && (
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent/50"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* メッセージ */}
        <div className="px-6 py-5">
          <ModalDescription className="leading-loose text-foreground">
            {message}
          </ModalDescription>
          {errorMessage && <p role="alert" className="mt-3 text-sm text-destructive">{errorMessage}</p>}
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border/70 bg-secondary/40">
          <Button
            ref={cancelRef}
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? '削除中...' : confirmText}
          </Button>
        </div>
    </Modal>
  );
}
