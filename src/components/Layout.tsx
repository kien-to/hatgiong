import { useEffect, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { formatPrice } from '@/domain/format'
import { useAuth } from '@/store/auth'
import { useCatalog } from '@/store/catalog'
import { useMarket } from '@/store/market'
import { useUI } from '@/store/ui'
import { useUser } from '@/store/user'
import { AccountMenu, AuthDialog, SetPasswordDialog } from './AuthDialog'
import { Logo } from './Logo'
import { Onboarding } from './Onboarding'
import { SearchBox } from './SearchBox'
import { Toasts } from './Toasts'
import { TutorPanel } from './TutorPanel'
import { SparkleIcon } from './ui'

const NAV = [
  { to: '/', label: 'Trang chủ', icon: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { to: '/market', label: 'Thị trường', icon: 'M4 19h16M6 16l4-5 3 3 5-7' },
  { to: '/portfolio', label: 'Danh mục', icon: 'M4 7h16v12H4zM9 7V5h6v2' },
  { to: '/learn', label: 'Học', icon: 'M4 6.5 12 3l8 3.5-8 3.5zM6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9' },
]

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function SessionBadge() {
  const status = useMarket((s) => s.status)
  if (status.alwaysOpen) return null
  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap text-xs font-semibold xl:inline-flex ${status.canTrade ? 'bg-brand-500/10 text-brand-500' : 'bg-canvas text-muted'}`}
      title="Giờ khớp lệnh: 9:15–11:30 và 13:00–14:30, thứ Hai–thứ Sáu"
    >
      🕘 {status.label}
    </span>
  )
}

function SourceBadge() {
  const source = useMarket((s) => s.source)
  const ready = useMarket((s) => s.ready)
  if (!ready || source === 'live') return null
  return (
    <span className="hidden rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-muted xl:inline-flex" title="Không kết nối được máy chủ dữ liệu, đang dùng giá mô phỏng">
      Giá mô phỏng
    </span>
  )
}

export function Layout({ children }: { children?: ReactNode }) {
  const onQuotes = useUser((s) => s.onQuotes)
  const connect = useMarket((s) => s.connect)
  const toast = useUI((s) => s.toast)
  const tutorOpen = useUI((s) => s.tutorOpen)
  const setTutorOpen = useUI((s) => s.setTutorOpen)
  const onboarded = useUser((s) => s.onboarded)
  const loaded = useUser((s) => s.loaded)
  const loadError = useUser((s) => s.loadError)
  const authStatus = useAuth((s) => s.status)
  const { pathname } = useLocation()

  useEffect(() => {
    void useAuth.getState().init()
    void useCatalog.getState().load()
  }, [])

  useEffect(() => {
    const unsubscribe = connect((quotes) => {
      void onQuotes(quotes).then((filled) => {
        for (const o of filled) {
          toast({
            tone: 'success',
            title: `Lệnh chờ đã khớp: ${o.side === 'buy' ? 'Mua' : 'Bán'} ${o.qty} ${o.symbol}`,
            body: `Giá khớp ${formatPrice(o.fillPrice ?? 0)} ₫`,
            ask: 'Lệnh giới hạn là gì?',
          })
        }
      })
    })
    return unsubscribe
  }, [connect, onQuotes, toast])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-full pb-24 lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:gap-6">
          <NavLink to="/">
            <Logo />
          </NavLink>
          <SearchBox className="hidden min-w-40 max-w-sm flex-1 md:block" />
          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-brand' : 'text-muted hover:text-ink'}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <SessionBadge />
            <SourceBadge />            <AccountMenu />
          </div>
          <button
            onClick={() => setTutorOpen(!tutorOpen)}
            className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 lg:inline-flex"
          >
            <SparkleIcon className="h-4 w-4 text-accent" />
            Hỏi Mầm
          </button>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <SearchBox />
        </div>
      </header>

      {(loadError || authStatus === 'error') && (
        <div className="mx-auto mt-4 max-w-6xl px-4">
          <div className="rounded-xl border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">
            Không kết nối được máy chủ tài khoản. Danh mục của bạn sẽ hiện lại khi kết nối được khôi phục.
            <button onClick={() => void useUser.getState().load()} className="ml-2 font-semibold underline">
              Thử lại
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pt-6">{children ?? <Outlet />}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}
            >
              <NavIcon d={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {!tutorOpen && (
        <button
          onClick={() => setTutorOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-accent shadow-xl transition hover:scale-105 lg:hidden"
          aria-label="Hỏi Mầm"
        >
          <SparkleIcon className="h-6 w-6" />
        </button>
      )}

      <TutorPanel />
      <Toasts />
      {loaded && !onboarded && <Onboarding />}
      <AuthDialog />
      <SetPasswordDialog />
    </div>
  )
}
