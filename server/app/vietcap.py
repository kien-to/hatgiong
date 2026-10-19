"""Vietnamese market data from Vietcap's public web endpoints.

These are the unauthenticated endpoints Vietcap's own trading website uses. They are not
a documented API and can change without notice, so every response is cached and callers
should expect failures.
"""

import asyncio
import html
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

BASE = "https://trading.vietcap.com.vn/api"
HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://trading.vietcap.com.vn/",
    "Origin": "https://trading.vietcap.com.vn",
    "User-Agent": "Mozilla/5.0 (hatgiong paper-trading app)",
}
VN_TZ = timezone(timedelta(hours=7))

QUOTE_TTL_S = 5
BOARD_TTL_S = 10
LISTING_TTL_S = 24 * 3600
DAILY_TTL_S = 600
INTRADAY_TTL_S = 30
BOARD_CHUNK = 300

BOARD_TO_EXCHANGE = {"HSX": "HOSE", "HNX": "HNX", "UPCOM": "UPCOM"}
TRADABLE_TYPES = {"STOCK", "ETF"}

ICB_SECTORS = {
    "0500": "Dầu khí",
    "1300": "Hóa chất",
    "1700": "Tài nguyên cơ bản",
    "2300": "Xây dựng & Vật liệu",
    "2700": "Hàng & Dịch vụ công nghiệp",
    "3300": "Ô tô & Phụ tùng",
    "3500": "Thực phẩm & Đồ uống",
    "3700": "Hàng cá nhân & Gia dụng",
    "4500": "Y tế",
    "5300": "Bán lẻ",
    "5500": "Truyền thông",
    "5700": "Du lịch & Giải trí",
    "6500": "Viễn thông",
    "7500": "Điện, nước & Xăng dầu",
    "8300": "Ngân hàng",
    "8500": "Bảo hiểm",
    "8600": "Bất động sản",
    "8700": "Dịch vụ tài chính",
    "9500": "Công nghệ thông tin",
}

RANGE_DAYS = {"1W": 5, "1M": 22, "3M": 66, "1Y": 250}


IQ_BASE = "https://iq.vietcap.com.vn/api/iq-insight-service/v1"
IQ_HEADERS = {"Referer": "https://iq.vietcap.com.vn/", "Origin": "https://iq.vietcap.com.vn", "User-Agent": HEADERS["User-Agent"]}
FUNDAMENTALS_SOURCE = "Vietcap IQ"
DESCRIPTION_MAX = 1000


class MarketDataError(Exception):
    pass


def _pct(x) -> float | None:
    return round(x * 100, 2) if isinstance(x, (int, float)) and x != 0 else None


def _ratio(x) -> float | None:
    return round(x, 2) if isinstance(x, (int, float)) and x > 0 else None


def _plain(markup: str | None) -> str | None:
    if not markup:
        return None
    text = html.unescape(re.sub(r"<[^>]+>", " ", markup))
    text = re.sub(r"\s+", " ", text).strip()
    return text[:DESCRIPTION_MAX] or None


def parse_fundamentals(ratios: list[dict], profile: dict | None, is_fund: bool = False) -> dict | None:
    """Latest trailing-12-month ratios plus the company description.

    Deliberately ignores the analyst fields in the profile (rating, target price, projected TSR):
    the app never shows investment recommendations.
    """
    description = _plain((profile or {}).get("profile"))
    quarterly = sorted((r for r in ratios if 1 <= (r.get("quarter") or 0) <= 4), key=lambda r: (r["yearReport"], r["quarter"]))
    if is_fund:
        empty = dict.fromkeys(("pe", "pb", "roe", "roa", "dividendYield", "dividendYear", "nim", "npl", "period"))
        return {**empty, "description": description} if description else None
    if not quarterly:
        return None
    latest = quarterly[-1]
    yearly = sorted((r for r in ratios if r.get("quarter") == 5 and (r.get("dividendYield") or 0) > 0), key=lambda r: r["yearReport"])
    dividend = yearly[-1] if yearly and yearly[-1]["yearReport"] >= latest["yearReport"] - 1 else None
    is_bank = bool((latest.get("netInterestMargin") or 0) > 0)
    return {
        "pe": _ratio(latest.get("pe")),
        "pb": _ratio(latest.get("pb")),
        "roe": _pct(latest.get("roe")),
        "roa": _pct(latest.get("roa")),
        "dividendYield": _pct(dividend["dividendYield"]) if dividend else None,
        "dividendYear": dividend["yearReport"] if dividend else None,
        "nim": _pct(latest.get("netInterestMargin")) if is_bank else None,
        "npl": _pct(latest.get("npl")) if is_bank else None,
        "period": f"Q{latest['quarter']}/{latest['yearReport']}",
        "description": description,
    }


class _Cache:
    def __init__(self) -> None:
        self._data: dict[str, tuple[float, Any]] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    async def get(self, key: str, ttl: float, load):
        hit = self._data.get(key)
        if hit and time.monotonic() - hit[0] < ttl:
            return hit[1]
        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            hit = self._data.get(key)
            if hit and time.monotonic() - hit[0] < ttl:
                return hit[1]
            value = await load()
            self._data[key] = (time.monotonic(), value)
            return value


class VietcapClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(base_url=BASE, headers=HEADERS, timeout=10)
        self._cache = _Cache()

    async def close(self) -> None:
        await self._http.aclose()

    async def _post(self, path: str, body: dict) -> Any:
        try:
            r = await self._http.post(path, json=body)
            r.raise_for_status()
            return r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise MarketDataError(f"Vietcap request to {path} failed: {e}") from e

    async def listing(self) -> list[dict]:
        async def load():
            try:
                r = await self._http.get("/price/symbols/getAll")
                r.raise_for_status()
                rows = r.json()
            except (httpx.HTTPError, ValueError) as e:
                raise MarketDataError(f"Vietcap listing failed: {e}") from e
            stocks = []
            for row in rows:
                exchange = BOARD_TO_EXCHANGE.get(row.get("board"))
                if not exchange or row.get("type") not in TRADABLE_TYPES:
                    continue
                stocks.append(
                    {
                        "symbol": row["symbol"],
                        "name": row.get("organName") or row.get("enOrganName") or row["symbol"],
                        "shortName": row.get("organShortName") or row.get("enOrganShortName"),
                        "exchange": exchange,
                        "type": row["type"],
                        "sector": "Quỹ ETF" if row["type"] == "ETF" else ICB_SECTORS.get(row.get("icbCode2") or "", "Khác"),
                    }
                )
            stocks.sort(key=lambda s: s["symbol"])
            return stocks

        return await self._cache.get("listing", LISTING_TTL_S, load)

    async def board(self) -> list[dict]:
        """Quotes for every tradable symbol, fetched in chunks and cached briefly."""

        async def load():
            symbols = [s["symbol"] for s in await self.listing()]
            chunks = [symbols[i : i + BOARD_CHUNK] for i in range(0, len(symbols), BOARD_CHUNK)]
            results = await asyncio.gather(*(self._post("/price/symbols/getList", {"symbols": c}) for c in chunks))
            return [q for rows in results for q in (_to_quote(row) for row in rows) if q]

        return await self._cache.get("board", BOARD_TTL_S, load)

    async def board_map(self) -> dict[str, dict]:
        return {q["symbol"]: q for q in await self.board()}

    async def fundamentals(self, symbol: str, is_fund: bool = False) -> dict | None:
        async def get(path: str):
            try:
                r = await self._http.get(f"{IQ_BASE}/company/{symbol}{path}", headers=IQ_HEADERS)
                r.raise_for_status()
                return r.json().get("data")
            except (httpx.HTTPError, ValueError) as e:
                raise MarketDataError(f"Vietcap IQ request for {symbol}{path} failed: {e}") from e

        ratios, profile = await asyncio.gather(get("/statistics-financial"), get(""))
        return parse_fundamentals(ratios or [], profile, is_fund)

    async def quotes(self, symbols: list[str]) -> list[dict]:
        key = "quotes:" + ",".join(sorted(symbols))

        async def load():
            rows = await self._post("/price/symbols/getList", {"symbols": symbols})
            return [q for q in (_to_quote(row) for row in rows) if q]

        return await self._cache.get(key, QUOTE_TTL_S, load)

    async def history(self, symbol: str, range_: str) -> list[dict]:
        if range_ == "1D":
            return await self._cache.get(f"intraday:{symbol}", INTRADAY_TTL_S, lambda: self._intraday(symbol))
        days = RANGE_DAYS.get(range_)
        if days is None:
            raise ValueError(f"unknown range {range_}")
        daily = await self._cache.get(f"daily:{symbol}", DAILY_TTL_S, lambda: self._bars(symbol, "ONE_DAY", 260))
        return daily[-days:]

    async def _intraday(self, symbol: str) -> list[dict]:
        bars = await self._bars(symbol, "ONE_MINUTE", 600)
        if not bars:
            return []
        last_day = datetime.fromtimestamp(bars[-1]["t"] / 1000, VN_TZ).date()
        return [b for b in bars if datetime.fromtimestamp(b["t"] / 1000, VN_TZ).date() == last_day]

    async def _bars(self, symbol: str, frame: str, count: int) -> list[dict]:
        body = {"timeFrame": frame, "symbols": [symbol], "to": int(time.time()) + 60, "countBack": count}
        data = await self._post("/chart/OHLCChart/gap-chart", body)
        if not data:
            return []
        s = data[0]
        return [
            {"t": int(t) * 1000, "o": o, "h": h, "l": lo, "c": c, "v": v}
            for t, o, h, lo, c, v in zip(s["t"], s["o"], s["h"], s["l"], s["c"], s["v"])
        ]


def _to_quote(row: dict) -> dict | None:
    info = row.get("listingInfo") or {}
    match = row.get("matchPrice") or {}
    symbol = info.get("symbol")
    ref = match.get("referencePrice") or info.get("refPrice")
    if not symbol or not ref:
        return None
    price = match.get("matchPrice") or ref
    return {
        "symbol": symbol,
        "price": price,
        "ref": ref,
        "ceiling": match.get("ceilingPrice") or info.get("ceiling"),
        "floor": match.get("floorPrice") or info.get("floor"),
        "open": match.get("openPrice") or price,
        "high": match.get("highest") or price,
        "low": match.get("lowest") or price,
        "volume": match.get("accumulatedVolume") or 0,
        "listedShares": info.get("listedShare"),
        "session": match.get("session"),
        "updatedAt": match.get("time"),
    }
