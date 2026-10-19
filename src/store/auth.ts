import type { AuthError, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import type { SessionUser } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import { useUser } from './user'

const PENDING_PASSWORD_KEY = 'hatgiong:pending-password'

const ERRORS: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  email_exists: 'Email này đã có tài khoản. Hãy chọn “Đăng nhập”.',
  user_already_exists: 'Email này đã có tài khoản. Hãy chọn “Đăng nhập”.',
  identity_already_exists: 'Tài khoản Google này đã được dùng. Hãy chọn “Đăng nhập” bằng Google.',
  weak_password: 'Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự.',
  email_address_invalid: 'Email không hợp lệ.',
  validation_failed: 'Thông tin chưa hợp lệ. Kiểm tra lại email và mật khẩu.',
  provider_disabled: 'Đăng nhập bằng Google chưa được bật trên máy chủ.',
  email_not_confirmed: 'Bạn cần xác nhận email trước khi đăng nhập.',
  over_email_send_rate_limit: 'Bạn gửi yêu cầu quá nhanh. Đợi một chút rồi thử lại.',
  over_request_rate_limit: 'Bạn thử quá nhiều lần. Đợi một chút rồi thử lại.',
}

function message(error: AuthError | null): string | null {
  if (!error) return null
  if (error.code && ERRORS[error.code]) return ERRORS[error.code]
  if (/provider is not enabled/i.test(error.message)) return ERRORS.provider_disabled
  return 'Có lỗi xảy ra. Bạn thử lại nhé.'
}

function toSessionUser(u: User): SessionUser {
  return { id: u.id, email: u.email || null, isAnonymous: Boolean(u.is_anonymous) }
}

const redirectTo = () => window.location.origin + window.location.pathname

interface AuthState {
  status: 'loading' | 'ready' | 'offline' | 'error'
  user: SessionUser | null
  needsPassword: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<string | null>
  /** Resolves to an error message, 'sent' when a confirmation email went out, or 'confirmed' when no email was needed. */
  upgradeWithEmail: (email: string) => Promise<string>
  setPassword: (password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  linkGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
}

let initialised = false

export const useAuth = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  needsPassword: false,

  init: async () => {
    if (initialised) return
    initialised = true
    if (!supabase) {
      set({ status: 'offline' })
      await useUser.getState().load()
      return
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? toSessionUser(session.user) : null
      const changed = user?.id !== get().user?.id
      const needsPassword = Boolean(user && !user.isAnonymous && user.email && localStorage.getItem(PENDING_PASSWORD_KEY))
      set({ user, needsPassword })
      // Supabase warns against awaiting auth calls inside this callback, so defer the reload.
      if (user && changed) setTimeout(() => void useUser.getState().load(), 0)
    })
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        set({ status: 'error' })
        return
      }
    }
    set({ status: 'ready' })
  },

  signIn: async (email, password) => {
    if (!supabase) return null
    return message((await supabase.auth.signInWithPassword({ email, password })).error)
  },

  upgradeWithEmail: async (email) => {
    if (!supabase) return 'sent'
    localStorage.setItem(PENDING_PASSWORD_KEY, '1')
    const { data, error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo() })
    if (error) {
      localStorage.removeItem(PENDING_PASSWORD_KEY)
      return message(error) ?? 'Có lỗi xảy ra.'
    }
    if (data.user?.email === email && !data.user.is_anonymous) {
      set({ user: toSessionUser(data.user), needsPassword: true })
      return 'confirmed'
    }
    return 'sent'
  },

  setPassword: async (password) => {
    if (!supabase) return null
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) {
      localStorage.removeItem(PENDING_PASSWORD_KEY)
      set({ needsPassword: false })
    }
    return message(error)
  },

  signInWithGoogle: async () => {
    if (!supabase) return null
    return message((await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })).error)
  },

  linkGoogle: async () => {
    if (!supabase) return null
    return message((await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: redirectTo() } })).error)
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    localStorage.removeItem(PENDING_PASSWORD_KEY)
    await supabase.auth.signInAnonymously()
  },
}))
