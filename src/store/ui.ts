import { create } from 'zustand'

export interface Toast {
  id: string
  tone: 'success' | 'error' | 'info'
  title: string
  body?: string
  ask?: string
}

export type AuthDialogMode = 'save' | 'signin'

interface UIState {
  tutorOpen: boolean
  authDialog: AuthDialogMode | null
  toasts: Toast[]
  setTutorOpen: (open: boolean) => void
  setAuthDialog: (mode: AuthDialogMode | null) => void
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useUI = create<UIState>()((set, get) => ({
  tutorOpen: false,
  authDialog: null,
  toasts: [],
  setTutorOpen: (tutorOpen) => set({ tutorOpen }),
  setAuthDialog: (authDialog) => set({ authDialog }),
  toast: (t) => {
    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { ...t, id }].slice(-3) })
    setTimeout(() => get().dismiss(id), 7000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
