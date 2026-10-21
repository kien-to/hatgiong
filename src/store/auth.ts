import type { AuthError, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import type { SessionUser } from '@/domain/types'
import { captchaToken } from '@/lib/captcha'
import { supabase } from '@/lib/supabase'
import { backendAccounts } from '@/services'
import { useUser } from './user'

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
  otp_expired: 'Mã không đúng hoặc đã hết hạn. Kiểm tra lại hoặc gửi mã mới.',
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

// Kept in user metadata so any browser that opens the confirmation link asks for a password.
const wantsPassword = (u: User | undefined) => Boolean(u?.user_metadata?.needs_password)

// The link carries a token hash, not a PKCE code, so it works in any browser.
async function verifyEmailLink(): Promise<void> {
  if (!supabase) return
  const url = new URL(window.location.href)
  const tokenHash = url.searchParams.get('token_hash')
  if (!tokenHash || url.searchParams.get('type') !== 'email_change') return
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email_change' })
}

async function signInAsGuest(): Promise<boolean> {
  if (!supabase) return false
  try {
    const captcha = await captchaToken()
    const { error } = await supabase.auth.signInAnonymously({ options: { captchaToken: captcha } })
    return !error
  } catch {
    return false
  }
}

interface AuthState {
  status: 'loading' | 'ready' | 'offline' | 'error'
  user: SessionUser | null
  needsPassword: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<string | null>
  /** Resolves to an error message, 'sent' when a confirmation email went out, or 'confirmed' when no email was needed. */
  upgradeWithEmail: (email: string) => Promise<string>
  /** Verifies the emailed code, then sets the password the guest chose before the code was sent. */
  confirmEmailCode: (email: string, code: string, password: string) => Promise<string | null>
  setPassword: (password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  linkGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
}

let initialised = false
let settingPassword = false

export const useAuth = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  needsPassword: false,

  init: async () => {
    if (initialised) return
    initialised = true
    if (!supabase || !backendAccounts) {
      set({ status: 'offline' })
      await useUser.getState().load()
      return
    }
    let awaitingConfirmation = false
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? toSessionUser(session.user) : null
      const changed = user?.id !== get().user?.id
      awaitingConfirmation = Boolean(user?.isAnonymous && wantsPassword(session?.user))
      const needsPassword = Boolean(user && !user.isAnonymous && user.email && wantsPassword(session?.user)) && !settingPassword
      set({ user, needsPassword })
      // Supabase warns against awaiting auth calls inside this callback, so defer the reload.
      if (user && changed) setTimeout(() => void useUser.getState().load(), 0)
    })
    // After confirming in another tab or app, the guest's token still says anonymous until it is refreshed.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && awaitingConfirmation) void supabase?.auth.refreshSession()
    })
    await verifyEmailLink()
    const { data } = await supabase.auth.getSession()
    if (!data.session && !(await signInAsGuest())) {
      set({ status: 'error' })
      return
    }
    set({ status: 'ready' })
  },

  signIn: async (email, password) => {
    if (!supabase) return null
    const captcha = await captchaToken().catch(() => null)
    if (captcha === null) return 'Không xác minh được bạn không phải robot. Tải lại trang và thử lại.'
    return message((await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captcha } })).error)
  },

  upgradeWithEmail: async (email) => {
    if (!supabase) return 'sent'
    const { data, error } = await supabase.auth.updateUser({ email, data: { needs_password: true } }, { emailRedirectTo: redirectTo() })
    if (error) return message(error) ?? 'Có lỗi xảy ra.'
    if (data.user?.email === email && !data.user.is_anonymous) {
      set({ user: toSessionUser(data.user), needsPassword: true })
      return 'confirmed'
    }
    return 'sent'
  },

  confirmEmailCode: async (email, code, password) => {
    if (!supabase) return null
    settingPassword = true
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email_change' })
      if (error) return message(error)
      const passwordError = await get().setPassword(password)
      if (passwordError) set({ needsPassword: true })
      return passwordError
    } finally {
      settingPassword = false
    }
  },

  setPassword: async (password) => {
    if (!supabase) return null
    const { error } = await supabase.auth.updateUser({ password, data: { needs_password: false } })
    if (!error) set({ needsPassword: false })
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
    if (!(await signInAsGuest())) set({ status: 'error' })
  },
}))
