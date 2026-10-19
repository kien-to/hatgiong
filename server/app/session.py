"""Vietnamese trading calendar: sessions, exchange holidays, T+2 settlement and day-order expiry.

Set MARKET_HOURS=always to trade around the clock in development.
"""

import os
from datetime import date, datetime, time, timedelta, timezone

from .holidays import HOLIDAYS

VN_TZ = timezone(timedelta(hours=7))
ALWAYS_OPEN = os.environ.get("MARKET_HOURS", "").lower() == "always"

# (start, end, session); HNX/UPCoM have no ATO, which only affects order types we don't offer.
SESSIONS = [
    (time(9, 0), time(9, 15), "ato"),
    (time(9, 15), time(11, 30), "continuous"),
    (time(11, 30), time(13, 0), "lunch"),
    (time(13, 0), time(14, 30), "continuous"),
    (time(14, 30), time(14, 45), "atc"),
    (time(14, 45), time(15, 0), "closing"),
]
CLOSE = time(15, 0)
SETTLEMENT_DAYS = 2
SETTLEMENT_TIME = time(13, 0)

LABELS = {
    "ato": "Phiên mở cửa (ATO)",
    "continuous": "Đang khớp lệnh liên tục",
    "lunch": "Nghỉ trưa",
    "atc": "Phiên đóng cửa (ATC)",
    "closing": "Sau giờ khớp lệnh",
    "pre": "Chưa mở cửa",
    "closed": "Đã đóng cửa",
    "weekend": "Nghỉ cuối tuần",
    "holiday": "Nghỉ lễ",
}


def now_vn() -> datetime:
    return datetime.now(VN_TZ)


def is_trading_day(d: date) -> bool:
    return d.weekday() < 5 and d not in HOLIDAYS


def session_at(t: datetime) -> str:
    if ALWAYS_OPEN:
        return "continuous"
    local = t.astimezone(VN_TZ)
    if local.date() in HOLIDAYS:
        return "holiday"
    if not is_trading_day(local.date()):
        return "weekend"
    clock = local.time()
    if clock < SESSIONS[0][0]:
        return "pre"
    for start, end, name in SESSIONS:
        if start <= clock < end:
            return name
    return "closed"


def can_fill(t: datetime) -> bool:
    return session_at(t) == "continuous"


def next_trading_day(d: date) -> date:
    d += timedelta(days=1)
    while not is_trading_day(d):
        d += timedelta(days=1)
    return d


def settles_at(filled_at: datetime) -> datetime:
    """Shares bought on day T can be sold from the afternoon session of T+2."""
    d = filled_at.astimezone(VN_TZ).date()
    if not is_trading_day(d):
        d = next_trading_day(d)
    for _ in range(SETTLEMENT_DAYS):
        d = next_trading_day(d)
    return datetime.combine(d, SETTLEMENT_TIME, VN_TZ)


def is_settled(filled_at: datetime, at: datetime) -> bool:
    if ALWAYS_OPEN:
        return True
    return at >= settles_at(filled_at)


def day_close(t: datetime) -> datetime:
    local = t.astimezone(VN_TZ)
    return datetime.combine(local.date(), CLOSE, VN_TZ)


def status(t: datetime | None = None) -> dict:
    t = t or now_vn()
    s = session_at(t)
    return {"session": s, "label": LABELS[s], "canTrade": s == "continuous", "alwaysOpen": ALWAYS_OPEN}
