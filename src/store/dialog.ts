import { create } from 'zustand';

interface DialogState {
  visible: boolean; title?: string; message: string;
  confirmText: string; cancelText?: string; destructive?: boolean; onConfirm?: () => void;
  show: (d: Partial<DialogState> & { message: string }) => void;
  close: () => void;
}

export const useDialog = create<DialogState>((set) => ({
  visible: false, message: '', confirmText: 'Okay',
  show: (d) => set({ visible: true, title: undefined, cancelText: undefined, destructive: false, onConfirm: undefined, confirmText: 'Okay', ...d }),
  close: () => set({ visible: false }),
}));

export const dialog = {
  alert: (message: string, title?: string) => useDialog.getState().show({ message, title }),
  confirm: (message: string, onConfirm: () => void, opts?: { title?: string; confirmText?: string; destructive?: boolean }) =>
    useDialog.getState().show({ message, onConfirm, cancelText: 'Cancelar', confirmText: opts?.confirmText ?? 'Confirmar', title: opts?.title, destructive: opts?.destructive }),
};
