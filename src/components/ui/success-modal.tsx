'use client';

import React, { useEffect, useRef } from 'react';
import { Modal, ModalTitle, ModalDescription } from './modal';
import { Button } from './button';
import { X, CheckCircle } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
  autoCloseMs?: number;
}

export function SuccessModal({
  isOpen,
  onClose,
  title = '成功',
  message = '操作が完了しました',
  buttonText = 'OK',
  autoCloseMs,
}: SuccessModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  // 自動クローズ機能
  useEffect(() => {
    if (isOpen && autoCloseMs && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  return (
    <Modal open={isOpen} onClose={onClose} hasDescription initialFocusRef={confirmRef}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/70">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-foreground" />
            <ModalTitle className="text-base font-semibold tracking-[0.08em] text-foreground">
              {title}
            </ModalTitle>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent/50"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* メッセージ */}
        <div className="px-6 py-5">
          <ModalDescription className="leading-loose text-foreground">
            {message}
          </ModalDescription>
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border/70 bg-secondary/40">
          <Button
            ref={confirmRef}
            size="sm"
            onClick={onClose}
          >
            {buttonText}
          </Button>
        </div>
    </Modal>
  );
}
