"""Order validation and fill math. Mirrors src/domain/market.ts and src/domain/trading.ts;
the frontend uses those for previews, this module is authoritative."""

import math
from dataclasses import dataclass

LOT_SIZE = 100
BROKER_FEE_RATE = 0.0015
SELL_TAX_RATE = 0.001
STARTING_CASH = 100_000_000


def js_round(x: float) -> int:
    return int(math.floor(x + 0.5))


def tick_size(price: float, exchange: str) -> int:
    if exchange != "HOSE":
        return 100
    if price < 10_000:
        return 10
    if price < 50_000:
        return 50
    return 100


def is_on_tick(price: int, exchange: str) -> bool:
    return price % tick_size(price, exchange) == 0


def order_fee(value: float) -> int:
    return js_round(value * BROKER_FEE_RATE)


def sell_tax(value: float) -> int:
    return js_round(value * SELL_TAX_RATE)


@dataclass
class Quote:
    price: int
    ceiling: int
    floor: int


@dataclass
class OrderRequest:
    symbol: str
    side: str
    type: str
    qty: int
    limit_price: int | None = None


@dataclass
class OrderError(Exception):
    message: str
    topic: str


@dataclass
class Fill:
    price: int
    value: int
    fee: int
    tax: int
    cash_delta: int
    new_qty: int
    new_avg_cost: float
    realized_pnl_delta: float


def reserved_cash(pending_buys: list[tuple[int, int]]) -> int:
    """pending_buys: (limit_price, qty) pairs."""
    total = 0
    for limit_price, qty in pending_buys:
        value = limit_price * qty
        total += value + order_fee(value)
    return total


def estimate_total(req: OrderRequest, market_price: int) -> int:
    price = req.limit_price if req.type == "limit" and req.limit_price else market_price
    value = price * req.qty
    return value + order_fee(value) if req.side == "buy" else value - order_fee(value) - sell_tax(value)


def validate(req: OrderRequest, exchange: str, quote: Quote, buying_power: int, available_to_sell: int) -> None:
    if req.qty <= 0:
        raise OrderError("Số lượng phải là số nguyên dương.", "quantity")
    if req.side == "buy" and req.qty % LOT_SIZE != 0:
        raise OrderError(f"Lệnh mua phải theo lô {LOT_SIZE} cổ phiếu (ví dụ 100, 200, 300…).", "lot")
    if req.side == "sell" and req.qty % LOT_SIZE != 0 and req.qty != available_to_sell:
        raise OrderError(f"Lệnh bán phải theo lô {LOT_SIZE}, trừ khi bạn bán hết số cổ phiếu lẻ còn lại.", "lot")
    if req.type == "limit":
        p = req.limit_price or 0
        if p < quote.floor or p > quote.ceiling:
            raise OrderError("Giá đặt phải nằm trong biên độ hôm nay: từ giá sàn đến giá trần.", "price-band")
        if not is_on_tick(p, exchange):
            raise OrderError("Giá đặt không đúng bước giá của sàn.", "tick")
    if req.side == "buy":
        if estimate_total(req, quote.price) > buying_power:
            raise OrderError("Sức mua không đủ cho lệnh này (đã tính cả phí giao dịch).", "buying-power")
    elif req.qty > available_to_sell:
        raise OrderError(f"Bạn chỉ có {available_to_sell} cổ phiếu {req.symbol} có thể bán.", "holdings")


def is_marketable(side: str, type_: str, limit_price: int | None, price: int) -> bool:
    if type_ == "market":
        return True
    limit = limit_price or 0
    return price <= limit if side == "buy" else price >= limit


def compute_fill(side: str, qty: int, fill_price: int, held_qty: int, avg_cost: float) -> Fill:
    value = fill_price * qty
    fee = order_fee(value)
    if side == "buy":
        new_qty = held_qty + qty
        new_avg = (avg_cost * held_qty + value + fee) / new_qty
        return Fill(fill_price, value, fee, 0, -(value + fee), new_qty, new_avg, 0.0)
    tax = sell_tax(value)
    basis = avg_cost if held_qty else fill_price
    return Fill(
        fill_price,
        value,
        fee,
        tax,
        value - fee - tax,
        held_qty - qty,
        basis,
        value - fee - tax - basis * qty,
    )
