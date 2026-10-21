import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui'
import { formatDate, formatDecimal, formatPct } from '@/domain/format'
import { ApiError } from '@/lib/api'
import { backendAccounts } from '@/services'
import { classesApi, type ClassReport, type JoinedClass, type OwnedClass } from '@/services/classes'
import { useAuth } from '@/store/auth'
import { useUI } from '@/store/ui'

function errorText(e: unknown): string {
  return e instanceof ApiError && e.body.detail ? e.body.detail : 'Có lỗi xảy ra, bạn thử lại nhé.'
}

function NeedsBackend() {
  return (
    <Card className="p-8 text-center text-sm text-muted">Lớp học cần kết nối máy chủ tài khoản. Chế độ ngoại tuyến không hỗ trợ tính năng này.</Card>
  )
}

export function ClassesPage() {
  const user = useAuth((s) => s.user)
  const setAuthDialog = useUI((s) => s.setAuthDialog)
  const [owned, setOwned] = useState<OwnedClass[]>([])
  const [joined, setJoined] = useState<JoinedClass[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await classesApi.list()
      setOwned(data.owned)
      setJoined(data.joined)
    } catch (e) {
      setError(errorText(e))
    }
  }, [])

  useEffect(() => {
    if (backendAccounts && user) void refresh()
  }, [user, refresh])

  if (!backendAccounts) return <NeedsBackend />
  const guest = user?.isAnonymous ?? true

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const join = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      await classesApi.join(code.trim())
      setCode('')
    })
  }

  const create = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      await classesApi.create(name.trim())
      setName('')
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lớp học</h1>
        <p className="text-sm text-muted">Học cùng bạn bè, câu lạc bộ hoặc lớp ở trường. Giáo viên theo dõi được tiến độ học và cách lớp quản lý rủi ro.</p>
      </div>

      {guest && (
        <Card className="flex flex-wrap items-center gap-3 border-ref/30 bg-ref/5 p-4 text-sm">
          <span className="flex-1">Bạn cần tạo tài khoản (miễn phí) để tham gia hoặc tạo lớp.</span>
          <button onClick={() => setAuthDialog('save')} className="rounded-xl bg-brand px-4 py-2 font-semibold text-white">
            Tạo tài khoản
          </button>
        </Card>
      )}

      {error && <p className="text-sm text-down">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Tham gia lớp</h2>
          <p className="mt-1 text-xs text-muted">
            Khi tham gia, giáo viên sẽ thấy <strong>tên hiển thị</strong>, tiến độ học và kết quả danh mục <strong>tiền ảo</strong> của bạn. Bạn có thể rời lớp bất cứ lúc nào.
          </p>
          <form onSubmit={join} className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Mã lớp, ví dụ K7P2QX"
              maxLength={12}
              disabled={guest}
              className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm uppercase tracking-widest outline-none focus:border-brand-500"
            />
            <button disabled={guest || busy || code.trim().length < 4} className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
              Tham gia
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">Tạo lớp (giáo viên, trưởng nhóm)</h2>
          <p className="mt-1 text-xs text-muted">Bạn nhận một mã 6 ký tự để chia sẻ với học viên.</p>
          <form onSubmit={create} className="mt-3 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên lớp, ví dụ Tài chính cá nhân K48"
              maxLength={80}
              disabled={guest}
              className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button disabled={guest || busy || !name.trim()} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
              Tạo
            </button>
          </form>
        </Card>
      </div>

      {owned.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Lớp bạn quản lý</h2>
          <div className="space-y-2">
            {owned.map((c) => (
              <Link key={c.id} to={`/classes/${c.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 hover:shadow-md">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted">{c.members} học viên</div>
                </div>
                <span className="rounded-lg bg-canvas px-3 py-1.5 font-mono text-sm font-bold tracking-widest">{c.joinCode}</span>
                <span className="text-muted">›</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {joined.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Lớp bạn tham gia</h2>
          <div className="space-y-2">
            {joined.map((c) => (
              <Card key={c.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.name}</div>
                  {c.teacher && <div className="text-xs text-muted">Giáo viên: {c.teacher}</div>}
                </div>
                <button
                  onClick={() => window.confirm(`Rời lớp “${c.name}”? Giáo viên sẽ không còn thấy tiến độ của bạn.`) && void act(() => classesApi.leave(c.id))}
                  className="text-sm font-semibold text-muted hover:text-down"
                >
                  Rời lớp
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function ClassReportPage() {
  const { classId = '' } = useParams()
  const user = useAuth((s) => s.user)
  const [report, setReport] = useState<ClassReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!backendAccounts || !user) return
    classesApi.report(classId).then(setReport, (e) => setError(errorText(e)))
  }, [classId, user])

  if (!backendAccounts) return <NeedsBackend />
  if (error) return <Card className="p-8 text-center text-sm text-muted">{error}</Card>
  if (!report) return <div className="py-20 text-center text-muted">Đang tải…</div>

  const m = report.members
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
  const concentrated = m.filter((x) => x.positions > 0 && x.maxWeightPct > 40).length
  const gain = avg(m.filter((x) => x.avgFirstPct !== null).map((x) => (x.avgBestPct ?? 0) - (x.avgFirstPct ?? 0)))

  return (
    <div className="space-y-6">
      <Link to="/classes" className="text-sm font-semibold text-muted hover:text-ink">
        ‹ Lớp học
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{report.name}</h1>
          <p className="text-sm text-muted">{m.length} học viên</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Mã tham gia</div>
          <div className="font-mono text-2xl font-extrabold tracking-[0.3em]">{report.joinCode}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="Bài học hoàn thành (TB)" value={m.length ? formatDecimal(avg(m.map((x) => x.lessonsDone)) ?? 0) : '—'} />
        <Summary label="Tiến bộ quiz (lần đầu → tốt nhất)" value={gain === null ? '—' : `+${Math.round(gain)} điểm`} />
        <Summary label="Danh mục quá tập trung" value={`${concentrated}/${m.length}`} hint="Một mã chiếm > 40% cổ phiếu" />
        <Summary label="Lệnh có ghi lý do" value={`${m.reduce((s, x) => s + x.reasonedOrders, 0)}/${m.reduce((s, x) => s + x.fills, 0)}`} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-canvas text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Học viên</th>
                <th className="px-3 text-right font-semibold">Bài học</th>
                <th className="px-3 text-right font-semibold">Quiz lần đầu → tốt nhất</th>
                <th className="px-3 text-right font-semibold">Ôn tập</th>
                <th className="px-3 text-right font-semibold">Lợi nhuận</th>
                <th className="px-3 text-right font-semibold">Số mã</th>
                <th className="px-3 text-right font-semibold">Mã lớn nhất</th>
                <th className="px-3 text-right font-semibold">Lệnh (có lý do)</th>
                <th className="px-4 text-right font-semibold">Tham gia</th>
              </tr>
            </thead>
            <tbody>
              {m.map((x, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-4 py-2.5 font-semibold">{x.name}</td>
                  <td className="px-3 text-right tabular">{x.lessonsDone}</td>
                  <td className="px-3 text-right tabular">
                    {x.avgFirstPct === null ? '—' : `${Math.round(x.avgFirstPct)}% → ${Math.round(x.avgBestPct ?? 0)}%`}
                  </td>
                  <td className="px-3 text-right tabular">{x.reviews}</td>
                  <td className={`px-3 text-right font-semibold tabular ${x.returnPct >= 0 ? 'text-up' : 'text-down'}`}>{formatPct(x.returnPct)}</td>
                  <td className="px-3 text-right tabular">{x.positions}</td>
                  <td className={`px-3 text-right tabular ${x.maxWeightPct > 40 ? 'font-semibold text-ref' : ''}`}>
                    {x.positions ? `${Math.round(x.maxWeightPct)}%` : '—'}
                  </td>
                  <td className="px-3 text-right tabular">
                    {x.fills} ({x.reasonedOrders})
                  </td>
                  <td className="px-4 text-right text-muted">{formatDate(x.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {m.length === 0 && <p className="py-10 text-center text-sm text-muted">Chưa có học viên. Chia sẻ mã {report.joinCode} để mời học viên tham gia.</p>}
      </Card>
      <p className="text-xs text-muted">Lợi nhuận chỉ là một phần nhỏ. Hãy chú ý hơn đến tiến bộ hiểu biết, mức độ đa dạng hóa và thói quen ghi lý do cho mỗi quyết định.</p>
    </div>
  )
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-4 py-3" >
      <div className="text-xs text-muted" title={hint}>
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular">{value}</div>
    </Card>
  )
}
