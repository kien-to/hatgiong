"""Load dividend events from a CSV into public.corporate_actions.

Columns: symbol,kind,ex_date,pay_date,cash_per_share,ratio,note
  kind: cash_dividend (cash_per_share in VND per share) or stock_dividend (ratio = new shares per share held)
  dates: YYYY-MM-DD (Vietnam calendar dates)

Usage: server/.venv/bin/python server/scripts/load_corporate_actions.py events.csv
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


def _dec(v: str) -> Decimal | None:
    return Decimal(v) if v.strip() else None


async def main(path: str) -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    loaded = 0
    try:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                await conn.execute(
                    """insert into public.corporate_actions (symbol, kind, ex_date, pay_date, cash_per_share, ratio, note)
                       values ($1, $2, $3, $4, $5, $6, $7)
                       on conflict (symbol, kind, ex_date) do update
                         set pay_date = excluded.pay_date, cash_per_share = excluded.cash_per_share,
                             ratio = excluded.ratio, note = excluded.note
                       where public.corporate_actions.entitled_at is null""",
                    row["symbol"].strip().upper(),
                    row["kind"].strip(),
                    date.fromisoformat(row["ex_date"].strip()),
                    date.fromisoformat(row["pay_date"].strip()),
                    _dec(row.get("cash_per_share", "")),
                    _dec(row.get("ratio", "")),
                    (row.get("note") or "").strip() or None,
                )
                loaded += 1
    finally:
        await conn.close()
    print(f"loaded {loaded} corporate actions")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1]))
