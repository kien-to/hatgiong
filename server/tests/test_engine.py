import pytest

from app.engine import OrderError, OrderRequest, Quote, compute_fill, reserved_cash, tick_size, validate

Q = Quote(price=60_000, ceiling=64_200, floor=55_800)


def topic(req: OrderRequest, power: int = 100_000_000, available: int = 0) -> str | None:
    try:
        validate(req, "HOSE", Q, power, available)
    except OrderError as e:
        return e.topic
    return None


def test_tick_sizes():
    assert tick_size(9_990, "HOSE") == 10
    assert tick_size(28_000, "HOSE") == 50
    assert tick_size(62_000, "HOSE") == 100
    assert tick_size(15_000, "HNX") == 100


def test_validation_topics():
    assert topic(OrderRequest("VNM", "buy", "market", 150)) == "lot"
    assert topic(OrderRequest("VNM", "buy", "limit", 100, 70_000)) == "price-band"
    assert topic(OrderRequest("VNM", "buy", "limit", 100, 60_050)) == "tick"
    assert topic(OrderRequest("VNM", "buy", "market", 2_000)) == "buying-power"
    assert topic(OrderRequest("VNM", "sell", "market", 100)) == "holdings"
    assert topic(OrderRequest("VNM", "sell", "market", 37), available=37) is None
    assert topic(OrderRequest("VNM", "buy", "market", 100)) is None


def test_buy_fill_folds_fee_into_cost():
    f = compute_fill("buy", 100, 60_000, 0, 0)
    assert f.fee == 9_000
    assert f.cash_delta == -6_009_000
    assert f.new_avg_cost == pytest.approx(60_090)


def test_sell_fill_books_realized_pnl():
    f = compute_fill("sell", 100, 62_000, 200, 60_090)
    assert (f.fee, f.tax) == (9_300, 6_200)
    assert f.new_qty == 100
    assert f.realized_pnl_delta == pytest.approx(6_200_000 - 9_300 - 6_200 - 6_009_000)


def test_reserved_cash():
    assert reserved_cash([(58_000, 100)]) == 5_800_000 + 8_700
