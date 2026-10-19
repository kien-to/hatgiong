"""Postgres access for user data and order execution.

The backend connects with a privileged role, so it bypasses RLS: every query here must be
scoped to the authenticated user's id.
"""

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import asyncpg

from . import engine
from .settings import DATABASE_URL

SNAPSHOT_INTERVAL = timedelta(minutes=10)
MAX_ORDERS = 200
MAX_SNAPSHOTS = 1000

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)


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
    return {
        "startingCash": pf["starting_cash"],
        "cash": pf["cash"],
        "realizedPnl": _num(pf["realized_pnl"]),
        "positions": {p["symbol"]: {"symbol": p["symbol"], "qty": p["qty"], "avgCost": _num(p["avg_cost"])} for p in positions},
        "orders": [_order(o) for o in orders],
        "equityHistory": [{"t": _ms(s["created_at"]), "v": _num(s["value"])} for s in snapshots],
    }


async def load_me(user_id: str, board: dict[str, dict]) -> dict:
    async with pool().acquire() as conn:
        profile = await conn.fetchrow("select display_name, level, onboarded from public.profiles where id = $1", user_id)
        if profile is None:
            raise LookupError("profile missing")
        account = await load_account(conn, user_id, board)
        watch = await conn.fetch("select symbol from public.watchlist where user_id = $1 order by created_at", user_id)
        quiz = await conn.fetch(
            """select lesson_id, max(score) as score, max(total) as total, count(*) as attempts, max(created_at) as last
               from public.quiz_attempts where user_id = $1 group by lesson_id""",
            user_id,
        )
    return {
        "profile": {"name": profile["display_name"], "level": profile["level"]},
        "onboarded": profile["onboarded"],
        "account": account,
        "watchlist": [w["symbol"] for w in watch],
        "quizResults": {
            q["lesson_id"]: {"score": q["score"], "total": q["total"], "attempts": q["attempts"], "completedAt": _ms(q["last"])}
            for q in quiz
        },
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


async def place_order(user_id: str, req: engine.OrderRequest, exchange: str, quote: dict, board: dict[str, dict]) -> dict:
    q = engine.Quote(price=quote["price"], ceiling=quote["ceiling"], floor=quote["floor"])
    async with pool().acquire() as conn, conn.transaction():
        cash = await conn.fetchval("select cash from public.portfolios where user_id = $1 for update", user_id)
        pending = await conn.fetch(
            "select side, symbol, qty, limit_price from public.orders where user_id = $1 and status = 'pending'", user_id
        )
        held = await conn.fetchval(
            "select qty from public.positions where user_id = $1 and symbol = $2", user_id, req.symbol
        ) or 0
        power = cash - engine.reserved_cash([(p["limit_price"], p["qty"]) for p in pending if p["side"] == "buy"])
        available = held - sum(p["qty"] for p in pending if p["side"] == "sell" and p["symbol"] == req.symbol)
        engine.validate(req, exchange, q, power, available)

        order = await conn.fetchrow(
            """insert into public.orders (user_id, symbol, side, type, qty, limit_price, status)
               values ($1, $2, $3, $4, $5, $6, 'pending') returning *""",
            user_id,
            req.symbol,
            req.side,
            req.type,
            req.qty,
            req.limit_price if req.type == "limit" else None,
        )
        if engine.is_marketable(req.side, req.type, req.limit_price, q.price):
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


async def pending_orders() -> list[asyncpg.Record]:
    return await pool().fetch(
        "select id, user_id, symbol, side, type, qty, limit_price from public.orders where status = 'pending' order by created_at"
    )


async def fill_pending(order_id, user_id, board: dict[str, dict]) -> bool:
    """Try to fill one pending limit order at its limit price. Returns True if filled."""
    async with pool().acquire() as conn, conn.transaction():
        await conn.execute("select 1 from public.portfolios where user_id = $1 for update", user_id)
        order = await conn.fetchrow("select * from public.orders where id = $1 and status = 'pending' for update", order_id)
        if order is None:
            return False
        quote = board.get(order["symbol"])
        if not quote or not engine.is_marketable(order["side"], order["type"], order["limit_price"], quote["price"]):
            return False
        try:
            await _fill(conn, str(user_id), order, order["limit_price"] or quote["price"], board)
        except engine.OrderError:
            await conn.execute("update public.orders set status = 'cancelled' where id = $1", order_id)
        return True
