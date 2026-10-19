"""Weekday market closures published by HOSE/HNX. Mirrored in src/domain/session.ts.

2026: HOSE notice of 09/12/2025 plus its 25/12/2025 update closing 02/01. Add each year's list
when the exchange publishes it (usually late November / December of the previous year).
"""

from datetime import date

HOLIDAYS: set[date] = {
    date(2026, 1, 1),
    date(2026, 1, 2),
    date(2026, 2, 16),
    date(2026, 2, 17),
    date(2026, 2, 18),
    date(2026, 2, 19),
    date(2026, 2, 20),
    date(2026, 4, 27),
    date(2026, 4, 30),
    date(2026, 5, 1),
    date(2026, 8, 31),
    date(2026, 9, 1),
    date(2026, 9, 2),
}
