import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/store/auth'
import { useUI, type AuthDialogMode } from '@/store/ui'
import { useUser } from '@/store/user'

const LOCAL_MAILBOX = 'http://127.0.0.1:54324'
const isLocalSupabase = /127\.0\.0\.1|localhost/.test(import.meta.env.VITE_SUPABASE_URL ?? '')

function GoogleButton({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white py-3 text-sm font-semibold transition hover:bg-canvas disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-muted">
      <div className="h-px flex-1 bg-line" />
      hoặc
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}

export function AuthDialog() {
  const mode = useUI((s) => s.authDialog)
  const setMode = useUI((s) => s.setAuthDialog)
  const user = useAuth((s) => s.user)
  const { signIn, upgradeWithEmail, signInWithGoogle, linkGoogle } = useAuth()
  const hasProgress = useUser((s) => s.account.orders.length > 0 || Object.keys(s.quizResults).length > 0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setSentTo(null)
  }, [mode])

  if (!mode) return null
  const guest = user?.isAnonymous ?? true
  const tab: AuthDialogMode = guest ? mode : 'signin'

  const run = async (fn: () => Promise<string | null>, onSuccess?: () => void) => {
    setBusy(true)
    setError(null)
    const err = await fn()
    setBusy(false)
    if (err) setError(err)
    else onSuccess?.()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (tab === 'save') {
      const address = email.trim()
      void run(async () => {
        const result = await upgradeWithEmail(address)
        if (result === 'sent') setSentTo(address)
        else if (result === 'confirmed') setMode(null)
        else return result
        return null
      })
    } else void run(() => signIn(email.trim(), password), () => setMode(null))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand/60 p-4 backdrop-blur-sm" onClick={() => setMode(null)}>
      <div className="fade-up w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{tab === 'save' ? 'Lưu tiến trình của bạn' : 'Đăng nhập'}</h2>
            <p className="mt-1 text-sm text-muted">
              {tab === 'save'
                ? 'Tạo tài khoản để giữ danh mục, lịch sử lệnh và điểm học trên mọi thiết bị.'
                : 'Đăng nhập vào tài khoản bạn đã tạo trước đó.'}
            </p>
          </div>
          <button onClick={() => setMode(null)} className="text-muted hover:text-ink" aria-label="Đóng">
            ✕
          </button>
        </div>

        {guest && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1 text-sm font-semibold">
            {(['save', 'signin'] as AuthDialogMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded-lg py-2 ${tab === m ? 'bg-white shadow-sm' : 'text-muted'}`}>
                {m === 'save' ? 'Tạo tài khoản' : 'Đã có tài khoản'}
              </button>
            ))}
          </div>
        )}

        {sentTo ? (
          <div className="mt-5 rounded-2xl bg-up/5 p-4 text-sm leading-relaxed">
            <div className="font-semibold">📬 Kiểm tra hộp thư {sentTo}</div>
            <p className="mt-1 text-muted">Nhấn vào liên kết xác nhận trong email. Sau đó bạn sẽ quay lại đây để đặt mật khẩu — mọi tiến trình hiện tại được giữ nguyên.</p>
            {isLocalSupabase && (
              <p className="mt-2 text-xs text-muted">
                Đang chạy local: email nằm ở{' '}
                <a href={LOCAL_MAILBOX} target="_blank" rel="noreferrer" className="font-semibold text-brand-500 underline">
                  {LOCAL_MAILBOX}
                </a>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <GoogleButton
              busy={busy}
              label={tab === 'save' ? 'Tiếp tục với Google' : 'Đăng nhập với Google'}
              onClick={() => void run(tab === 'save' ? linkGoogle : signInWithGoogle)}
            />
            <Divider />
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              {tab === 'signin' && (
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              )}
              {tab === 'signin' && guest && hasProgress && (
                <p className="rounded-xl bg-ref/10 p-3 text-xs text-ink">
                  ⚠️ Tiến trình bạn đang có ở chế độ khách sẽ không được chuyển sang tài khoản cũ. Muốn giữ lại, hãy chọn “Tạo tài khoản”.
                </p>
              )}
              {error && <p className="text-sm text-down">{error}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white transition hover:bg-accent-600 disabled:opacity-50">
                {busy ? 'Đang xử lý…' : tab === 'save' ? 'Gửi email xác nhận' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export function SetPasswordDialog() {
  const needsPassword = useAuth((s) => s.needsPassword)
  const email = useAuth((s) => s.user?.email)
  const setPassword = useAuth((s) => s.setPassword)
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!needsPassword) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (pw !== confirm) {
      setError('Hai mật khẩu chưa khớp.')
      return
    }
    setBusy(true)
    setError(await setPassword(pw))
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand/60 p-4 backdrop-blur-sm">
      <form onSubmit={(e) => void submit(e)} className="fade-up w-full max-w-md space-y-3 rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold">Email đã được xác nhận 🎉</h2>
        <p className="text-sm text-muted">Đặt mật khẩu để đăng nhập bằng {email} lần sau.</p>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Mật khẩu (ít nhất 8 ký tự)"
          className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Nhập lại mật khẩu"
          className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        {error && <p className="text-sm text-down">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent-600 disabled:opacity-50">
          {busy ? 'Đang lưu…' : 'Lưu mật khẩu'}
        </button>
      </form>
    </div>
  )
}

export function AccountMenu() {
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const setMode = useUI((s) => s.setAuthDialog)
  const [open, setOpen] = useState(false)
  if (status === 'offline' || !user) return null

  if (user.isAnonymous) {
    return (
      <button
        onClick={() => setMode('save')}
        className="rounded-full border border-brand/15 bg-white px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-brand-500 hover:text-brand-500"
      >
        Khách · Lưu tiến trình
      </button>
    )
  }
  const initial = (user.email ?? '?').charAt(0).toUpperCase()
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-label="Tài khoản">
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-line bg-white p-2 shadow-xl" onMouseLeave={() => setOpen(false)}>
          <div className="truncate px-3 py-2 text-sm text-muted">{user.email}</div>
          <button
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-canvas"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}
