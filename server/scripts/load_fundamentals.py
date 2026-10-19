"""Load company fundamentals from a CSV into public.stock_fundamentals.

Columns: symbol,pe,pb,eps,roe,dividend_yield,description,source,as_of
  pe/pb: ratios; eps: VND per share; roe/dividend_yield: percent (6.2 = 6.2%)
  source: where the numbers came from (provider name or "BCTC 2025"); as_of: YYYY-MM-DD
  Leave a cell empty when unknown. Rows replace earlier rows for the same symbol.

Usage: server/.venv/bin/python server/scripts/load_fundamentals.py fundamentals.csv
"""

import asyncio
import csv
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.settings import DATABASE_URL  # noqa: E402

NUMERIC = ("pe", "pb", "eps", "roe", "dividend_yield")


def _dec(v: str | None) -> Decimal | None:
    return Decimal(v) if v and v.strip() else None


async def main(path: str) -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    loaded = 0
    try:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if not row.get("source", "").strip() or not row.get("as_of", "").strip():
                    raise SystemExit(f"{row.get('symbol')}: source and as_of are required")
                await conn.execute(
                    """insert into public.stock_fundamentals (symbol, pe, pb, eps, roe, dividend_yield, description, source, as_of)
                       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                       on conflict (symbol) do update set pe = excluded.pe, pb = excluded.pb, eps = excluded.eps,
                         roe = excluded.roe, dividend_yield = excluded.dividend_yield, description = excluded.description,
                         source = excluded.source, as_of = excluded.as_of, updated_at = now()""",
                    row["symbol"].strip().upper(),
                    *(_dec(row.get(k)) for k in NUMERIC),
                    (row.get("description") or "").strip() or None,
                    row["source"].strip(),
                    date.fromisoformat(row["as_of"].strip()),
                )
                loaded += 1
    finally:
        await conn.close()
    print(f"loaded fundamentals for {loaded} symbols")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1]))
