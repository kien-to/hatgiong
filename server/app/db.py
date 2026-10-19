"""Postgres access for user data and order execution.

The backend connects with a privileged role, so it bypasses RLS: every query here must be
scoped to the authenticated user's id.
"""

import json
import math
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from urllib.parse import urlparse

import asyncpg

from . import engine, session
from .settings import DATABASE_URL

SNAPSHOT_INTERVAL = timedelta(minutes=10)
MAX_ORDERS = 200
MAX_SNAPSHOTS = 1000
MAX_QUIZ_ATTEMPTS = 500
SETTLEMENT_LOOKBACK = timedelta(days=7)
DIVIDEND_TAX_RATE = 0.05
JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    cache = 0 if urlparse(DATABASE_URL).port == 6543 else 100
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10, statement_cache_size=cache)


async def close_pool() -> None:
    if _pool:
        await _pool.close()


def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("database pool not initialised")
    return _pool


def _num(x: Decimal | int | float | None) -> float | None:
    return None if x is None else float(x)


def _dec(x: float) -> Decimal:
    return Decimal(f"{x:.4f}")


def _ms(t: datetime | None) -> int | None:
    return None if t is None else int(t.timestamp() * 1000)


def _order(row: asyncpg.Record) -> dict:
    return {
        "id": str(row["id"]),
        "symbol": row["symbol"],
        "side": row["side"],
        "type": row["type"],
        "qty": row["qty"],
        "limitPrice": row["limit_price"],
        "status": row["status"],
        "fillPrice": row["fill_price"],
        "fee": row["fee"],
        "tax": row["tax"],
        "note": row["note"],
        "createdAt": _ms(row["created_at"]),
        "filledAt": _ms(row["filled_at"]),
    }


def _equity(cash: int, positions: list[asyncpg.Record], board: dict[str, dict]) -> float:
    total = float(cash)
    for p in positions:
        price = board.get(p["symbol"], {}).get("price") or float(p["avg_cost"])
        total += p["qty"] * price
    return total


async def _snapshot(conn: asyncpg.Connection, user_id: str, board: dict[str, dict]) -> None:
    cash = await conn.fetchval("select cash from public.portfolios where user_id = $1", user_id)
    positions = await conn.fetch("select symbol, qty, avg_cost from public.positions where user_id = $1", user_id)
    await conn.execute(
        "insert into public.equity_snapshots (user_id, value) values ($1, $2)", user_id, _dec(_equity(cash, positions, board))
    )


async def _unsettled(conn: asyncpg.Connection, user_id: str, symbol: str | None = None) -> dict[str, int]:
    rows = await conn.fetch(
        """select symbol, qty, filled_at from public.orders
           where user_id = $1 and side = 'buy' and status = 'filled' and filled_at > $2
             and ($3::text is null or symbol = $3)""",
        user_id,
        datetime.now(timezone.utc) - SETTLEMENT_LOOKBACK,
        symbol,
    )
    now = session.now_vn()
    out: dict[str, int] = {}
    for r in rows:
        if not session.is_settled(r["filled_at"], now):
            out[r["symbol"]] = out.get(r["symbol"], 0) + r["qty"]
    return out


async def load_account(conn: asyncpg.Connection, user_id: str, board: dict[str, dict]) -> dict:
    last = await conn.fetchval("select max(created_at) from public.equity_snapshots where user_id = $1", user_id)
    if board and (last is None or datetime.now(timezone.utc) - last > SNAPSHOT_INTERVAL):
        await _snapshot(conn, user_id, board)
    pf = await conn.fetchrow("select starting_cash, cash, realized_pnl from public.portfolios where user_id = $1", user_id)
    positions = await conn.fetch("select symbol, qty, avg_cost from public.positions where user_id = $1", user_id)
    orders = await conn.fetch(
        "select * from public.orders where user_id = $1 order by created_at desc limit $2", user_id, MAX_ORDERS
    )
    snapshots = await conn.fetch(
        """select value, created_at from (
             select value, created_at from public.equity_snapshots where user_id = $1
             order by created_at desc limit $2) s
           order by created_at""",
        user_id,
        MAX_SNAPSHOTS,
    )
    dividends = await conn.fetch(
        """select a.symbol, a.kind, a.ex_date, a.pay_date, p.qty, p.cash, p.tax, p.shares, p.paid_at
           from public.dividend_payouts p join public.corporate_actions a on a.id = p.action_id
           where p.user_id = $1 order by a.ex_date desc limit 50""",
        user_id,
    )
    return {
        "startingCash": pf["starting_cash"],
        "cash": pf["cash"],
        "realizedPnl": _num(pf["realized_pnl"]),
        "positions": {p["symbol"]: {"symbol": p["symbol"], "qty": p["qty"], "avgCost": _num(p["avg_cost"])} for p in positions},
        "unsettled": await _unsettled(conn, user_id),
        "orders": [_order(o) for o in orders],
        "equityHistory": [{"t": _ms(s["created_at"]), "v": _num(s["value"])} for s in snapshots],
        "dividends": [
            {
                "symbol": d["symbol"],
                "kind": d["kind"],
                "exDate": d["ex_date"].isoformat(),
                "payDate": d["pay_date"].isoformat(),
                "qty": d["qty"],
                "cash": d["cash"],
                "tax": d["tax"],
                "shares": d["shares"],
                "paid": d["paid_at"] is not None,
            }
            for d in dividends
        ],
    }


async def load_me(user_id: str, board: dict[str, dict]) -> dict:
    async with pool().acquire() as conn:
        profile = await conn.fetchrow("select display_name, level, onboarded from public.profiles where id = $1", user_id)
        if profile is None:
            raise LookupError("profile missing")
        account = await load_account(conn, user_id, board)
        watch = await conn.fetch("select symbol from public.watchlist where user_id = $1 order by created_at", user_id)
        attempts = await conn.fetch(
            """select lesson_id, score, total, answers, created_at from public.quiz_attempts
               where user_id = $1 order by created_at desc limit $2""",
            user_id,
            MAX_QUIZ_ATTEMPTS,
        )
    quiz_results: dict[str, dict] = {}
    for a in reversed(attempts):
        if a["lesson_id"] == "review":
            continue
        prev = quiz_results.get(a["lesson_id"])
        quiz_results[a["lesson_id"]] = {
            "score": max(a["score"], prev["score"] if prev else 0),
            "total": a["total"],
            "attempts": (prev["attempts"] if prev else 0) + 1,
            "completedAt": _ms(a["created_at"]),
        }
    return {
        "profile": {"name": profile["display_name"], "level": profile["level"]},
        "onboarded": profile["onboarded"],
        "account": account,
        "watchlist": [w["symbol"] for w in watch],
        "quizResults": quiz_results,
        "quizAttempts": [
            {
                "lessonId": a["lesson_id"],
                "score": a["score"],
                "total": a["total"],
                "answers": json.loads(a["answers"]) if isinstance(a["answers"], str) else a["answers"],
                "createdAt": _ms(a["created_at"]),
            }
            for a in reversed(attempts)
        ],
    }


async def _fill(conn: asyncpg.Connection, user_id: str, order: asyncpg.Record, fill_price: int, board: dict[str, dict]) -> asyncpg.Record:
    """Fill a pending order. Caller holds the portfolio row lock inside a transaction."""
    pos = await conn.fetchrow(
        "select qty, avg_cost from public.positions where user_id = $1 and symbol = $2 for update", user_id, order["symbol"]
    )
    held = pos["qty"] if pos else 0
    avg = float(pos["avg_cost"]) if pos else 0.0
    f = engine.compute_fill(order["side"], order["qty"], fill_price, held, avg)
    cash = await conn.fetchval("select cash from public.portfolios where user_id = $1", user_id)
    if cash + f.cash_delta < 0:
        raise engine.OrderError("Sức mua không đủ cho lệnh này (đã tính cả phí giao dịch).", "buying-power")
    if order["side"] == "sell" and order["qty"] > held:
        raise engine.OrderError(f"Bạn chỉ có {held} cổ phiếu {order['symbol']} có thể bán.", "holdings")

    await conn.execute(
        """update public.portfolios set cash = cash + $2, realized_pnl = realized_pnl + $3, updated_at = now()
           where user_id = $1""",
        user_id,
        f.cash_delta,
        _dec(f.realized_pnl_delta),
    )
    if f.new_qty > 0:
        await conn.execute(
            """insert into public.positions (user_id, symbol, qty, avg_cost) values ($1, $2, $3, $4)
               on conflict (user_id, symbol) do update set qty = excluded.qty, avg_cost = excluded.avg_cost, updated_at = now()""",
            user_id,
            order["symbol"],
            f.new_qty,
            _dec(f.new_avg_cost),
        )
    else:
        await conn.execute("delete from public.positions where user_id = $1 and symbol = $2", user_id, order["symbol"])
    filled = await conn.fetchrow(
        """update public.orders set status = 'filled', fill_price = $2, fee = $3, tax = $4, filled_at = now()
           where id = $1 returning *""",
        order["id"],
        fill_price,
        f.fee,
        f.tax,
    )
    await _snapshot(conn, user_id, board)
    return filled


async def place_order(
    user_id: str, req: engine.OrderRequest, exchange: str, quote: dict, board: dict[str, dict], note: str | None
) -> dict:
    q = engine.Quote(price=quote["price"], ceiling=quote["ceiling"], floor=quote["floor"])
    now = session.now_vn()
    open_now = session.can_fill(now)
    if req.type == "market" and not open_now:
        raise engine.OrderError(
            "Lệnh thị trường chỉ dùng được trong giờ khớp lệnh liên tục (9:15–11:30, 13:00–14:30). Hãy đặt lệnh giới hạn (LO) để chờ phiên sau.",
            "session",
        )
    async with pool().acquire() as conn, conn.transaction():
        cash = await conn.fetchval("select cash from public.portfolios where user_id = $1 for update", user_id)
        pending = await conn.fetch(
            "select side, symbol, qty, limit_price from public.orders where user_id = $1 and status = 'pending'", user_id
        )
        held = await conn.fetchval(
            "select qty from public.positions where user_id = $1 and symbol = $2", user_id, req.symbol
        ) or 0
        unsettled = (await _unsettled(conn, user_id, req.symbol)).get(req.symbol, 0)
        power = cash - engine.reserved_cash([(p["limit_price"], p["qty"]) for p in pending if p["side"] == "buy"])
        pending_sells = sum(p["qty"] for p in pending if p["side"] == "sell" and p["symbol"] == req.symbol)
        available = held - unsettled - pending_sells
        if req.side == "sell" and unsettled and req.qty > available:
            raise engine.OrderError(
                f"{unsettled} cổ phiếu {req.symbol} bạn mua gần đây chưa về tài khoản (thanh toán T+2), nên bạn chỉ bán được {max(available, 0)} cổ.",
                "settlement",
            )
        engine.validate(req, exchange, q, power, available)

        order = await conn.fetchrow(
            """insert into public.orders (user_id, symbol, side, type, qty, limit_price, status, note)
               values ($1, $2, $3, $4, $5, $6, 'pending', $7) returning *""",
            user_id,
            req.symbol,
            req.side,
            req.type,
            req.qty,
            req.limit_price if req.type == "limit" else None,
            note or None,
        )
        if open_now and engine.is_marketable(req.side, req.type, req.limit_price, q.price):
            order = await _fill(conn, user_id, order, q.price, board)
        account = await load_account(conn, user_id, {})
    return {"order": _order(order), "account": account}


async def cancel_order(user_id: str, order_id: str) -> dict:
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """update public.orders set status = 'cancelled' where id = $1 and user_id = $2 and status = 'pending'
               returning id""",
            order_id,
            user_id,
        )
        if row is None:
            raise LookupError("order not found or not pending")
        return await load_account(conn, user_id, {})


async def reset_portfolio(user_id: str) -> dict:
    async with pool().acquire() as conn, conn.transaction():
        await conn.execute("select 1 from public.portfolios where user_id = $1 for update", user_id)
        await conn.execute("delete from public.positions where user_id = $1", user_id)
        await conn.execute("delete from public.orders where user_id = $1", user_id)
        await conn.execute("delete from public.equity_snapshots where user_id = $1", user_id)
        await conn.execute("delete from public.dividend_payouts where user_id = $1", user_id)
        await conn.execute(
            """update public.portfolios set cash = starting_cash, realized_pnl = 0, reset_count = reset_count + 1,
               updated_at = now() where user_id = $1""",
            user_id,
        )
        await conn.execute(
            "insert into public.equity_snapshots (user_id, value) select user_id, starting_cash from public.portfolios where user_id = $1",
            user_id,
        )
        return await load_account(conn, user_id, {})


async def update_profile(user_id: str, name: str, level: str, onboarded: bool) -> None:
    await pool().execute(
        "update public.profiles set display_name = $2, level = $3, onboarded = $4, updated_at = now() where id = $1",
        user_id,
        name,
        level,
        onboarded,
    )


async def set_watch(user_id: str, symbol: str, on: bool) -> list[str]:
    async with pool().acquire() as conn:
        if on:
            await conn.execute(
                "insert into public.watchlist (user_id, symbol) values ($1, $2) on conflict do nothing", user_id, symbol
            )
        else:
            await conn.execute("delete from public.watchlist where user_id = $1 and symbol = $2", user_id, symbol)
        rows = await conn.fetch("select symbol from public.watchlist where user_id = $1 order by created_at", user_id)
    return [r["symbol"] for r in rows]


async def record_quiz(user_id: str, lesson_id: str, score: int, total: int, answers: dict) -> None:
    await pool().execute(
        "insert into public.quiz_attempts (user_id, lesson_id, score, total, answers) values ($1, $2, $3, $4, $5::jsonb)",
        user_id,
        lesson_id,
        score,
        total,
        json.dumps(answers),
    )


# --- matcher, expiry and dividends (background) ---


async def pending_orders() -> list[asyncpg.Record]:
    return await pool().fetch(
        "select id, user_id, symbol, side, type, qty, limit_price from public.orders where status = 'pending' order by created_at"
    )


async def fill_pending(order_id, user_id, board: dict[str, dict]) -> bool:
    """Fill one resting limit order at the current price once it is marketable. Returns True if handled."""
    async with pool().acquire() as conn, conn.transaction():
        await conn.execute("select 1 from public.portfolios where user_id = $1 for update", user_id)
        order = await conn.fetchrow("select * from public.orders where id = $1 and status = 'pending' for update", order_id)
        if order is None:
            return False
        quote = board.get(order["symbol"])
        if not quote or not engine.is_marketable(order["side"], order["type"], order["limit_price"], quote["price"]):
            return False
        try:
            await _fill(conn, str(user_id), order, quote["price"], board)
        except engine.OrderError:
            await conn.execute("update public.orders set status = 'cancelled' where id = $1", order_id)
        return True


def last_close(now: datetime) -> datetime:
    d = now.astimezone(session.VN_TZ).date()
    close = datetime.combine(d, session.CLOSE, session.VN_TZ)
    while not session.is_trading_day(d) or close > now:
        d -= timedelta(days=1)
        close = datetime.combine(d, session.CLOSE, session.VN_TZ)
    return close


async def expire_day_orders(now: datetime) -> int:
    """LO orders are valid for one session: expire those placed before the most recent close."""
    if session.ALWAYS_OPEN:
        return 0
    result = await pool().execute(
        "update public.orders set status = 'expired' where status = 'pending' and created_at < $1", last_close(now)
    )
    return int(result.split()[-1])


async def process_dividends(today) -> int:
    handled = 0
    async with pool().acquire() as conn:
        to_entitle = await conn.fetch(
            "select * from public.corporate_actions where entitled_at is null and ex_date <= $1", today
        )
        for a in to_entitle:
            async with conn.transaction():
                holders = await conn.fetch("select user_id, qty from public.positions where symbol = $1", a["symbol"])
                for h in holders:
                    cash = tax = shares = 0
                    if a["kind"] == "cash_dividend":
                        gross = int(round(h["qty"] * float(a["cash_per_share"])))
                        tax = int(round(gross * DIVIDEND_TAX_RATE))
                        cash = gross - tax
                    else:
                        shares = math.floor(h["qty"] * float(a["ratio"]))
                    await conn.execute(
                        """insert into public.dividend_payouts (action_id, user_id, qty, cash, tax, shares)
                           values ($1, $2, $3, $4, $5, $6) on conflict do nothing""",
                        a["id"],
                        h["user_id"],
                        h["qty"],
                        cash,
                        tax,
                        shares,
                    )
                await conn.execute("update public.corporate_actions set entitled_at = now() where id = $1", a["id"])
            handled += 1

        to_pay = await conn.fetch(
            "select * from public.corporate_actions where entitled_at is not null and paid_at is null and pay_date <= $1", today
        )
        for a in to_pay:
            async with conn.transaction():
                payouts = await conn.fetch(
                    "select * from public.dividend_payouts where action_id = $1 and paid_at is null", a["id"]
                )
                for p in payouts:
                    await conn.execute("select 1 from public.portfolios where user_id = $1 for update", p["user_id"])
                    if p["cash"]:
                        await conn.execute(
                            "update public.portfolios set cash = cash + $2, updated_at = now() where user_id = $1",
                            p["user_id"],
                            p["cash"],
                        )
                    if p["shares"]:
                        pos = await conn.fetchrow(
                            "select qty, avg_cost from public.positions where user_id = $1 and symbol = $2 for update",
                            p["user_id"],
                            a["symbol"],
                        )
                        if pos:
                            qty = pos["qty"] + p["shares"]
                            avg = float(pos["avg_cost"]) * pos["qty"] / qty
                            await conn.execute(
                                "update public.positions set qty = $3, avg_cost = $4, updated_at = now() where user_id = $1 and symbol = $2",
                                p["user_id"],
                                a["symbol"],
                                qty,
                                _dec(avg),
                            )
                        else:
                            await conn.execute(
                                "insert into public.positions (user_id, symbol, qty, avg_cost) values ($1, $2, $3, 0)",
                                p["user_id"],
                                a["symbol"],
                                p["shares"],
                            )
                    await conn.execute(
                        "update public.dividend_payouts set paid_at = now() where action_id = $1 and user_id = $2",
                        a["id"],
                        p["user_id"],
                    )
                await conn.execute("update public.corporate_actions set paid_at = now() where id = $1", a["id"])
            handled += 1
    return handled


FUNDAMENTAL_FIELDS = ("pe", "pb", "eps", "roe", "roa", "dividend_yield", "nim", "npl")


def _fundamental(r: asyncpg.Record) -> dict:
    return {
        "symbol": r["symbol"],
        "pe": _num(r["pe"]),
        "pb": _num(r["pb"]),
        "eps": _num(r["eps"]),
        "roe": _num(r["roe"]),
        "roa": _num(r["roa"]),
        "dividendYield": _num(r["dividend_yield"]),
        "dividendYear": r["dividend_year"],
        "nim": _num(r["nim"]),
        "npl": _num(r["npl"]),
        "period": r["period"],
        "description": r["description"],
        "source": r["source"],
        "asOf": r["as_of"].isoformat(),
    }


async def fundamentals() -> list[dict]:
    return [_fundamental(r) for r in await pool().fetch("select * from public.stock_fundamentals")]


async def get_fundamental(symbol: str) -> tuple[dict, datetime] | None:
    row = await pool().fetchrow("select * from public.stock_fundamentals where symbol = $1", symbol)
    return (_fundamental(row), row["updated_at"]) if row else None


async def cache_fundamental(symbol: str, data: dict, source: str) -> dict:
    def dec(v):
        return None if v is None else Decimal(str(v))

    row = await pool().fetchrow(
        """insert into public.stock_fundamentals
             (symbol, pe, pb, eps, roe, roa, dividend_yield, dividend_year, nim, npl, period, description, source, as_of)
           values ($1, $2, $3, null, $4, $5, $6, $7, $8, $9, $10, $11, $12, current_date)
           on conflict (symbol) do update set pe = excluded.pe, pb = excluded.pb, roe = excluded.roe, roa = excluded.roa,
             dividend_yield = excluded.dividend_yield, dividend_year = excluded.dividend_year, nim = excluded.nim,
             npl = excluded.npl, period = excluded.period, description = excluded.description,
             source = excluded.source, as_of = excluded.as_of, updated_at = now()
           where public.stock_fundamentals.source = excluded.source
           returning *""",
        symbol,
        dec(data["pe"]),
        dec(data["pb"]),
        dec(data["roe"]),
        dec(data["roa"]),
        dec(data["dividendYield"]),
        data["dividendYear"],
        dec(data["nim"]),
        dec(data["npl"]),
        data["period"],
        data["description"],
        source,
    )
    if row is None:
        existing = await get_fundamental(symbol)
        return existing[0] if existing else {}
    return _fundamental(row)


# --- tutor usage ---


async def tutor_usage(user_id: str, since_minute: datetime, since_day: datetime) -> tuple[int, int]:
    row = await pool().fetchrow(
        """select count(*) filter (where created_at >= $2) as minute, count(*) filter (where created_at >= $3) as day
           from public.tutor_events where user_id = $1 and created_at >= least($2, $3)""",
        user_id,
        since_minute,
        since_day,
    )
    return row["minute"], row["day"]


async def record_tutor_event(user_id: str) -> int:
    return await pool().fetchval("insert into public.tutor_events (user_id) values ($1) returning id", user_id)


async def set_tutor_usage(event_id: int, input_tokens: int, output_tokens: int) -> None:
    await pool().execute(
        "update public.tutor_events set input_tokens = $2, output_tokens = $3 where id = $1", event_id, input_tokens, output_tokens
    )


# --- classes ---


def _join_code() -> str:
    return "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(6))


async def create_class(owner_id: str, name: str) -> dict:
    for _ in range(5):
        try:
            row = await pool().fetchrow(
                "insert into public.classes (owner_id, name, join_code) values ($1, $2, $3) returning *", owner_id, name, _join_code()
            )
            return {"id": str(row["id"]), "name": row["name"], "joinCode": row["join_code"], "members": 0}
        except asyncpg.UniqueViolationError:
            continue
    raise RuntimeError("could not allocate a join code")


async def join_class(user_id: str, code: str) -> dict:
    async with pool().acquire() as conn:
        cls = await conn.fetchrow("select id, name, owner_id from public.classes where join_code = $1", code.upper())
        if cls is None:
            raise LookupError("Mã lớp không đúng.")
        if str(cls["owner_id"]) == user_id:
            raise ValueError("Bạn là giáo viên của lớp này.")
        await conn.execute(
            "insert into public.class_members (class_id, user_id) values ($1, $2) on conflict do nothing", cls["id"], user_id
        )
    return {"id": str(cls["id"]), "name": cls["name"]}


async def leave_class(user_id: str, class_id: str) -> None:
    await pool().execute("delete from public.class_members where class_id = $1 and user_id = $2", class_id, user_id)


async def my_classes(user_id: str) -> dict:
    async with pool().acquire() as conn:
        owned = await conn.fetch(
            """select c.id, c.name, c.join_code, count(m.user_id) as members from public.classes c
               left join public.class_members m on m.class_id = c.id
               where c.owner_id = $1 group by c.id order by c.created_at""",
            user_id,
        )
        joined = await conn.fetch(
            """select c.id, c.name, p.display_name as teacher from public.class_members m
               join public.classes c on c.id = m.class_id
               left join public.profiles p on p.id = c.owner_id
               where m.user_id = $1 order by m.joined_at""",
            user_id,
        )
    return {
        "owned": [{"id": str(r["id"]), "name": r["name"], "joinCode": r["join_code"], "members": r["members"]} for r in owned],
        "joined": [{"id": str(r["id"]), "name": r["name"], "teacher": r["teacher"] or ""} for r in joined],
    }


async def class_report(owner_id: str, class_id: str, board: dict[str, dict]) -> dict:
    async with pool().acquire() as conn:
        cls = await conn.fetchrow("select id, name, join_code from public.classes where id = $1 and owner_id = $2", class_id, owner_id)
        if cls is None:
            raise LookupError("class not found")
        members = await conn.fetch(
            """select m.user_id, m.joined_at, p.display_name, pf.cash, pf.starting_cash, pf.reset_count
               from public.class_members m
               join public.profiles p on p.id = m.user_id
               join public.portfolios pf on pf.user_id = m.user_id
               where m.class_id = $1 order by m.joined_at""",
            class_id,
        )
        ids = [m["user_id"] for m in members]
        positions = await conn.fetch("select user_id, symbol, qty, avg_cost from public.positions where user_id = any($1)", ids)
        orders = await conn.fetch(
            """select user_id, count(*) filter (where status = 'filled') as fills,
                      count(*) filter (where note is not null and note <> '') as reasoned,
                      max(created_at) as last_order
               from public.orders where user_id = any($1) group by user_id""",
            ids,
        )
        quiz = await conn.fetch(
            """select user_id, lesson_id, max(score::float / total) as best, min(created_at) as first_at,
                      (array_agg(score::float / total order by created_at))[1] as first_score
               from public.quiz_attempts where user_id = any($1) and lesson_id <> 'review'
               group by user_id, lesson_id""",
            ids,
        )
        reviews = await conn.fetch(
            "select user_id, count(*) as n from public.quiz_attempts where user_id = any($1) and lesson_id = 'review' group by user_id",
            ids,
        )
    by_user_pos: dict = {}
    for p in positions:
        by_user_pos.setdefault(p["user_id"], []).append(p)
    order_stats = {o["user_id"]: o for o in orders}
    quiz_by_user: dict = {}
    for q in quiz:
        quiz_by_user.setdefault(q["user_id"], []).append(q)
    review_counts = {r["user_id"]: r["n"] for r in reviews}

    rows = []
    for m in members:
        pos = by_user_pos.get(m["user_id"], [])
        values = [p["qty"] * (board.get(p["symbol"], {}).get("price") or float(p["avg_cost"])) for p in pos]
        invested = sum(values)
        equity = m["cash"] + invested
        lessons = quiz_by_user.get(m["user_id"], [])
        o = order_stats.get(m["user_id"])
        rows.append(
            {
                "name": m["display_name"] or "Học viên",
                "joinedAt": _ms(m["joined_at"]),
                "returnPct": (equity - m["starting_cash"]) / m["starting_cash"] * 100,
                "positions": len(pos),
                "maxWeightPct": (max(values) / invested * 100) if invested else 0,
                "cashPct": m["cash"] / equity * 100 if equity else 100,
                "fills": o["fills"] if o else 0,
                "reasonedOrders": o["reasoned"] if o else 0,
                "lessonsDone": len(lessons),
                "avgBestPct": (sum(q["best"] for q in lessons) / len(lessons) * 100) if lessons else None,
                "avgFirstPct": (sum(q["first_score"] for q in lessons) / len(lessons) * 100) if lessons else None,
                "reviews": review_counts.get(m["user_id"], 0),
                "resets": m["reset_count"],
                "lastActive": _ms(o["last_order"]) if o and o["last_order"] else None,
            }
        )
    return {"id": str(cls["id"]), "name": cls["name"], "joinCode": cls["join_code"], "members": rows}
