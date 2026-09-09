'use client';

import { useRef, type ReactNode, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  hasDescription?: boolean;
  initialFocusRef?: RefObject<HTMLButtonElement | null>;
  className?: string;
  overlayClassName?: string;
}

/** Shared modal behavior: focus containment, background isolation, Escape and focus restoration. */
export function Modal({ open, onClose, children, busy = false, hasDescription = false, initialFocusRef, className, overlayClassName }: ModalProps) {
  const opener = useRef<HTMLElement | null>(null);
  const requestClose = () => { if (!busy) onClose(); };

  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) requestClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="modal-backdrop"
          className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4 overflow-y-auto', overlayClassName)}
        >
          <Dialog.Content
            className={cn('relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-soft)]', className)}
            aria-modal="true"
            aria-busy={busy || undefined}
            {...(!hasDescription ? { 'aria-describedby': undefined } : {})}
            onOpenAutoFocus={event => {
              opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
              if (initialFocusRef?.current && !initialFocusRef.current.disabled) {
                event.preventDefault();
                initialFocusRef.current.focus();
              }
            }}
            onCloseAutoFocus={event => {
              if (opener.current?.isConnected && opener.current !== document.body) {
                event.preventDefault();
                opener.current.focus();
              }
            }}
            onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
            onInteractOutside={event => { if (busy) event.preventDefault(); }}
          >
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;
