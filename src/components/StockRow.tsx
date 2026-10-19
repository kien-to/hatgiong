import { Link } from 'react-router-dom'
import { useStock } from '@/store/catalog'
import { useHistory } from '@/hooks/useHistory'
import { useMarket } from '@/store/market'
import { Sparkline } from './charts'
import { ChangePill, LivePrice, StockLogo } from './ui'

export function StockRow({ symbol, subtitle }: { symbol: string; subtitle?: string }) {
  const quote = useMarket((s) => s.quotes[symbol])
  const history = useHistory(symbol, '1D')
  const stock = useStock(symbol)
  if (!stock || !quote) return null
  const color = quote.price >= quote.ref ? 'var(--color-up)' : 'var(--color-down)'
  return (
    <Link to={`/stock/${symbol}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-canvas">
      <StockLogo symbol={symbol} size={38} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{symbol}</div>
        <div className="truncate text-xs text-muted">{subtitle ?? stock.shortName ?? stock.name}</div>
      </div>
      <Sparkline data={history.map((c) => c.c)} color={color} width={72} height={28} />
      <div className="w-24 text-right">
        <LivePrice quote={quote} className="text-sm font-semibold" />
        <div className="mt-0.5">
          <ChangePill quote={quote} />
        </div>
      </div>
    </Link>
  )
}
