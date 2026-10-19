from datetime import datetime

from app.session import VN_TZ, is_settled, session_at, settles_at


def vn(y, m, d, h, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=VN_TZ)


def test_sessions():
    assert session_at(vn(2026, 10, 19, 8, 59)) == "pre"
    assert session_at(vn(2026, 10, 19, 9, 5)) == "ato"
    assert session_at(vn(2026, 10, 19, 10, 0)) == "continuous"
    assert session_at(vn(2026, 10, 19, 12, 0)) == "lunch"
    assert session_at(vn(2026, 10, 19, 14, 40)) == "atc"
    assert session_at(vn(2026, 10, 19, 15, 30)) == "closed"
    assert session_at(vn(2026, 10, 18, 10, 0)) == "weekend"


def test_holidays_close_the_market():
    assert session_at(vn(2026, 2, 18, 10)) == "holiday"
    assert session_at(vn(2026, 1, 2, 10)) == "holiday"


def test_t_plus_two_skips_tet():
    assert settles_at(vn(2026, 2, 12, 10)).date() == vn(2026, 2, 23, 0).date()


def test_t_plus_two_skips_weekend():
    thursday = vn(2026, 10, 15, 10)
    assert settles_at(thursday) == vn(2026, 10, 19, 13)
    assert not is_settled(thursday, vn(2026, 10, 19, 12, 59))
    assert is_settled(thursday, vn(2026, 10, 19, 13, 0))
