from app.vietcap import parse_fundamentals


def ratio(year, quarter, **kw):
    return {"yearReport": year, "quarter": quarter, **kw}


def test_uses_latest_quarter_and_latest_yearly_dividend():
    ratios = [
        ratio(2025, 4, pe=12.0, pb=3.0, roe=0.30, roa=0.2, dividendYield=0.0),
        ratio(2025, 5, pe=12.5, dividendYield=0.0753),
        ratio(2026, 3, pe=11.0189, pb=3.79, roe=0.3386, roa=0.1976, dividendYield=0.0),
    ]
    profile = {"profile": "<div>C&ocirc;ng ty Sữa&nbsp;Việt Nam</div>", "rating": "BUY", "targetPrice": 70300}
    f = parse_fundamentals(ratios, profile)
    assert f["pe"] == 11.02 and f["pb"] == 3.79 and f["roe"] == 33.86
    assert f["dividendYield"] == 7.53 and f["dividendYear"] == 2025
    assert f["period"] == "Q3/2026"
    assert f["description"] == "Công ty Sữa Việt Nam"
    assert "rating" not in f and "targetPrice" not in f
    assert f["nim"] is None


def test_negative_pe_is_dropped_and_banks_get_bank_ratios():
    f = parse_fundamentals([ratio(2026, 3, pe=-4.0, pb=1.9, roe=0.18, roa=0.017, netInterestMargin=0.0275, npl=0.0061)], None)
    assert f["pe"] is None
    assert f["nim"] == 2.75 and f["npl"] == 0.61


def test_funds_get_description_only():
    f = parse_fundamentals([ratio(2026, 3, pe=1.5, roe=0.0)], {"profile": "<p>Quỹ ETF</p>"}, is_fund=True)
    assert f["pe"] is None and f["roe"] is None and f["description"] == "Quỹ ETF"


def test_no_quarterly_data():
    assert parse_fundamentals([ratio(2025, 5, pe=10)], None) is None
