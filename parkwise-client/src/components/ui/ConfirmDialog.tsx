import { type ReactNode } from 'react';
import { Button } from './primitives';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
