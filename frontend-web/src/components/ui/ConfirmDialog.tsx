import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// The ConfirmDialog component displays a modal dialog for confirming an action. It takes in props for controlling its visibility, title, message, confirm button label, and callback functions for confirming or canceling the action.
export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  if (!open) return null;

    return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-soft" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted mt-2">{message}</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel ?? t("common.delete")}</Button>
        </div>
      </div>
    </div>
  );
}