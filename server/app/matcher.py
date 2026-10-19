import asyncio
import logging
import time

from . import db, engine, session
from .vietcap import MarketDataError, VietcapClient

log = logging.getLogger("hatgiong.matcher")
INTERVAL_S = 5
HOUSEKEEPING_S = 60


async def match_once(vietcap: VietcapClient) -> int:
    if not session.can_fill(session.now_vn()):
        return 0
    pending = await db.pending_orders()
    if not pending:
        return 0
    board = await vietcap.board_map()
    filled = 0
    for o in pending:
        q = board.get(o["symbol"])
        if q and engine.is_marketable(o["side"], o["type"], o["limit_price"], q["price"]):
            if await db.fill_pending(o["id"], o["user_id"], board):
                filled += 1
    return filled


async def housekeeping() -> None:
    now = session.now_vn()
    expired = await db.expire_day_orders(now)
    if expired:
        log.info("expired %d day orders", expired)
    handled = await db.process_dividends(now.date())
    if handled:
        log.info("processed %d corporate action steps", handled)


async def run(vietcap: VietcapClient) -> None:
    last_housekeeping = 0.0
    while True:
        try:
            if time.monotonic() - last_housekeeping >= HOUSEKEEPING_S:
                await housekeeping()
                last_housekeeping = time.monotonic()
            n = await match_once(vietcap)
            if n:
                log.info("filled %d pending orders", n)
        except MarketDataError as e:
            log.warning("matcher skipped: %s", e)
        except Exception:
            log.exception("matcher iteration failed")
        await asyncio.sleep(INTERVAL_S)
