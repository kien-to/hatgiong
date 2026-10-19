import { useState } from 'react'
import { formatVND } from '@/domain/format'
import { STARTING_CASH } from '@/domain/market'
import type { ExperienceLevel } from '@/domain/types'
import { useAuth } from '@/store/auth'
import { useUser } from '@/store/user'
import { Logo } from './Logo'

const LEVELS: { value: ExperienceLevel; title: string; body: string }[] = [
  { value: 'newbie', title: 'Hoàn toàn mới', body: 'Mình chưa từng mua cổ phiếu' },
  { value: 'some', title: 'Biết một chút', body: 'Mình đã tìm hiểu hoặc mua thử vài lần' },
  { value: 'experienced', title: 'Có kinh nghiệm', body: 'Mình muốn thử chiến lược mới an toàn' },
]

const PILLARS = [
  { icon: '💸', title: 'Tập với tiền ảo', body: `${formatVND(STARTING_CASH)} để mua bán cổ phiếu Việt Nam, không rủi ro.` },
  { icon: '🌱', title: 'Học qua từng quyết định', body: 'Mầm giải thích khái niệm đúng lúc bạn gặp nó.' },
  { icon: '🎯', title: 'Đo lường sự tiến bộ', body: 'Bài học ngắn, câu hỏi kiểm tra và điểm hiểu rủi ro.' },
]

export function Onboarding() {
  const complete = useUser((s) => s.completeOnboarding)
  const isGuest = useAuth((s) => s.user?.isAnonymous ?? false)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [level, setLevel] = useState<ExperienceLevel>('newbie')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand/70 p-4 backdrop-blur-sm">
      <div className="fade-up w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-brand via-brand-600 to-brand-500 px-7 pb-8 pt-7 text-white">
          <Logo light />
          <h1 className="mt-6 text-2xl font-bold leading-tight">
            {step === 0 ? 'Đầu tư thử, học thật.' : step === 1 ? 'Làm quen một chút nhé' : 'Bạn đã sẵn sàng!'}
          </h1>
          <p className="mt-2 text-sm text-white/75">
            {step === 0
              ? 'Nơi an toàn để học cách thị trường chứng khoán Việt Nam vận hành — trước khi dùng tiền thật.'
              : step === 1
                ? 'Mầm sẽ điều chỉnh cách giải thích theo kinh nghiệm của bạn.'
                : 'Tài khoản mô phỏng của bạn đã được nạp tiền ảo.'}
          </p>
          <div className="mt-5 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        <div className="px-7 py-6">
          {step === 0 && (
            <div className="space-y-4">
              {PILLARS.map((p) => (
                <div key={p.title} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-xl">{p.icon}</div>
                  <div>
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-sm text-muted">{p.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold">Mầm nên gọi bạn là gì?</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Minh"
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-brand-500"
                />
              </label>
              <div>
                <span className="text-sm font-semibold">Kinh nghiệm đầu tư của bạn</span>
                <div className="mt-1.5 space-y-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLevel(l.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${level === l.value ? 'border-brand-500 bg-brand-500/5' : 'border-line hover:border-muted'}`}
                    >
                      <div className={`h-4 w-4 rounded-full border-2 ${level === l.value ? 'border-brand-500 bg-brand-500 shadow-[inset_0_0_0_2px_white]' : 'border-line'}`} />
                      <div>
                        <div className="text-sm font-semibold">{l.title}</div>
                        <div className="text-xs text-muted">{l.body}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="text-sm text-muted">Số dư tiền ảo</div>
              <div className="mt-1 text-4xl font-extrabold tracking-tight text-brand tabular">{formatVND(STARTING_CASH)}</div>
              <p className="mx-auto mt-4 max-w-sm text-sm text-muted">
                Giá cổ phiếu là <strong>giá thật</strong> từ HOSE, HNX và UPCoM, và lệnh tuân theo quy tắc thật (biên độ, bước giá, lô 100, phí và thuế). Nhưng bạn giao dịch bằng tiền ảo — không có tiền thật nào được sử dụng.
              </p>
              {isGuest && (
                <p className="mx-auto mt-3 max-w-sm rounded-xl bg-canvas p-3 text-xs text-muted">
                  Bạn đang dùng thử với tư cách <strong>khách</strong>. Tạo tài khoản bất cứ lúc nào (email hoặc Google) để lưu tiến trình trên mọi thiết bị.
                </p>
              )}
            </div>
          )}

          <div className="mt-7 flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="rounded-xl border border-line px-5 py-3 text-sm font-semibold">
                Quay lại
              </button>
            )}
            <button
              onClick={() => (step < 2 ? setStep(step + 1) : complete({ name: name.trim(), level }))}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white transition hover:bg-accent-600"
            >
              {step === 0 ? 'Bắt đầu' : step === 1 ? 'Tiếp tục' : 'Vào ứng dụng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
