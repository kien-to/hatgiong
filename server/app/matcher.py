import asyncio
import logging

from . import db, engine
from .vietcap import MarketDataError, VietcapClient

log = logging.getLogger("hatgiong.matcher")
INTERVAL_S = 5


async def match_once(vietcap: VietcapClient) -> int:
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


async def run(vietcap: VietcapClient) -> None:
    while True:
        try:
            n = await match_once(vietcap)
            if n:
                log.info("filled %d pending orders", n)
        except MarketDataError as e:
            log.warning("matcher skipped: %s", e)
        except Exception:
            log.exception("matcher iteration failed")
        await asyncio.sleep(INTERVAL_S)
