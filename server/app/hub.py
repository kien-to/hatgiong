import asyncio
import contextlib
import logging

from fastapi import WebSocket, WebSocketDisconnect

from .vietcap import MarketDataError, VietcapClient

log = logging.getLogger("hatgiong.hub")
INTERVAL_S = 5
FIELDS = ("price", "ref", "ceiling", "floor", "high", "low", "volume")


class BoardHub:
    """Fans one shared price-board poll out to every connected browser as diffs."""

    def __init__(self, vietcap: VietcapClient) -> None:
        self._vietcap = vietcap
        self._clients: set[WebSocket] = set()
        self._last: dict[str, tuple] = {}

    async def serve(self, ws: WebSocket) -> None:
        await ws.accept()
        try:
            board = await self._vietcap.board()
            await ws.send_json({"type": "snapshot", "quotes": board})
        except MarketDataError:
            await ws.close(code=1011)
            return
        self._clients.add(ws)
        try:
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            self._clients.discard(ws)

    async def run(self) -> None:
        while True:
            try:
                if self._clients:
                    await self._broadcast()
            except MarketDataError as e:
                log.warning("board refresh failed: %s", e)
            except Exception:
                log.exception("hub iteration failed")
            await asyncio.sleep(INTERVAL_S)

    async def _broadcast(self) -> None:
        board = await self._vietcap.board()
        changed = []
        for q in board:
            key = tuple(q.get(f) for f in FIELDS)
            if self._last.get(q["symbol"]) != key:
                self._last[q["symbol"]] = key
                changed.append(q)
        if not changed:
            return
        message = {"type": "diff", "quotes": changed}
        for ws in list(self._clients):
            with contextlib.suppress(Exception):
                await ws.send_json(message)
