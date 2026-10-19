import asyncio
import contextlib
import logging
import re
from contextlib import asynccontextmanager
from typing import Literal

import uuid
from datetime import timedelta

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import db, engine, matcher, session
from .auth import AuthUser, current_user
from .hub import BoardHub
from .settings import CORS_ORIGINS
from .tutor import has_credentials, stream_reply
from .vietcap import MarketDataError, VietcapClient

logging.basicConfig(level=logging.INFO)

SYMBOL_RE = re.compile(r"^[A-Z0-9]{3,10}$")
MAX_SYMBOLS = 100
MAX_HISTORY = 20
TUTOR_PER_MINUTE = 6
TUTOR_PER_DAY_GUEST = 20
TUTOR_PER_DAY_MEMBER = 100

vietcap = VietcapClient()
hub = BoardHub(vietcap)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.init_pool()
    tasks = [asyncio.create_task(matcher.run(vietcap)), asyncio.create_task(hub.run())]
    yield
    for task in tasks:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
    await db.close_pool()
    await vietcap.close()


app = FastAPI(title="Hạt Giống API", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=2048)
if CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(MarketDataError)
async def market_data_error(_, e: MarketDataError):
    return JSONResponse({"detail": str(e)}, status_code=502)


@app.exception_handler(engine.OrderError)
async def order_error(_, e: engine.OrderError):
    return JSONResponse({"detail": e.message, "topic": e.topic}, status_code=422)


def _symbol(s: str) -> str:
    s = s.strip().upper()
    if not SYMBOL_RE.match(s):
        raise HTTPException(400, f"invalid symbol: {s}")
    return s


async def _board_or_empty() -> dict[str, dict]:
    try:
        return await vietcap.board_map()
    except MarketDataError:
        return {}


# --- market data (public) ---


@app.get("/api/health")
async def health():
    return {"ok": True, "tutor": has_credentials()}


@app.get("/api/market-status")
async def market_status():
    return session.status()


@app.websocket("/api/ws/board")
async def board_ws(ws: WebSocket):
    await hub.serve(ws)


@app.get("/api/stocks")
async def stocks():
    return await vietcap.listing()


@app.get("/api/board")
async def board():
    return await vietcap.board()


@app.get("/api/quotes")
async def quotes(symbols: str = Query(..., description="Comma-separated tickers")):
    tickers = [_symbol(s) for s in symbols.split(",") if s.strip()][:MAX_SYMBOLS]
    if not tickers:
        raise HTTPException(400, "no symbols")
    return await vietcap.quotes(tickers)


@app.get("/api/history/{symbol}")
async def history(symbol: str, range: Literal["1D", "1W", "1M", "3M", "1Y"] = "1M"):
    return await vietcap.history(_symbol(symbol), range)


# --- user data (authenticated) ---


@app.get("/api/me")
async def me(user: AuthUser = Depends(current_user)):
    data = await db.load_me(user.id, await _board_or_empty())
    return {"user": {"id": user.id, "isAnonymous": user.is_anonymous, "email": user.email}, **data}


class ProfileBody(BaseModel):
    name: str = Field(default="", max_length=60)
    level: Literal["newbie", "some", "experienced"] = "newbie"
    onboarded: bool = True


@app.put("/api/profile", status_code=204)
async def put_profile(body: ProfileBody, user: AuthUser = Depends(current_user)):
    await db.update_profile(user.id, body.name.strip(), body.level, body.onboarded)


class OrderBody(BaseModel):
    symbol: str
    side: Literal["buy", "sell"]
    type: Literal["market", "limit"]
    qty: int = Field(gt=0, le=10_000_000)
    limitPrice: int | None = Field(default=None, gt=0)
    note: str | None = Field(default=None, max_length=500)


@app.post("/api/orders")
async def post_order(body: OrderBody, user: AuthUser = Depends(current_user)):
    symbol = _symbol(body.symbol)
    listing = {s["symbol"]: s for s in await vietcap.listing()}
    stock = listing.get(symbol)
    if not stock:
        raise HTTPException(404, f"unknown symbol {symbol}")
    if body.type == "limit" and body.limitPrice is None:
        raise HTTPException(400, "limit orders need limitPrice")
    board_map = await vietcap.board_map()
    quote = board_map.get(symbol)
    if not quote:
        raise HTTPException(503, f"no live quote for {symbol}")
    req = engine.OrderRequest(symbol, body.side, body.type, body.qty, body.limitPrice)
    note = body.note.strip() if body.note else None
    return await db.place_order(user.id, req, stock["exchange"], quote, board_map, note)


@app.post("/api/orders/{order_id}/cancel")
async def cancel(order_id: str, user: AuthUser = Depends(current_user)):
    try:
        return {"account": await db.cancel_order(user.id, _uuid(order_id))}
    except LookupError as e:
        raise HTTPException(404, str(e)) from e


@app.post("/api/portfolio/reset")
async def reset(user: AuthUser = Depends(current_user)):
    return {"account": await db.reset_portfolio(user.id)}


@app.put("/api/watchlist/{symbol}")
async def watch(symbol: str, user: AuthUser = Depends(current_user)):
    return {"watchlist": await db.set_watch(user.id, _symbol(symbol), True)}


@app.delete("/api/watchlist/{symbol}")
async def unwatch(symbol: str, user: AuthUser = Depends(current_user)):
    return {"watchlist": await db.set_watch(user.id, _symbol(symbol), False)}


class QuizBody(BaseModel):
    lessonId: str = Field(pattern=r"^[a-z0-9-]{1,40}$")
    score: int = Field(ge=0)
    total: int = Field(gt=0, le=50)
    answers: dict[str, int] = Field(default={}, max_length=50)


@app.post("/api/quiz-attempts", status_code=204)
async def quiz(body: QuizBody, user: AuthUser = Depends(current_user)):
    if body.score > body.total:
        raise HTTPException(400, "score exceeds total")
    await db.record_quiz(user.id, body.lessonId, body.score, body.total, body.answers)


# --- AI tutor ---


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class TutorRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = []
    context: dict = {}


@app.post("/api/tutor")
async def tutor(req: TutorRequest, user: AuthUser = Depends(current_user)):
    now = session.now_vn()
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    per_minute, per_day = await db.tutor_usage(user.id, now - timedelta(minutes=1), midnight)
    daily_limit = TUTOR_PER_DAY_GUEST if user.is_anonymous else TUTOR_PER_DAY_MEMBER
    if per_minute >= TUTOR_PER_MINUTE:
        raise HTTPException(429, "Bạn hỏi hơi nhanh 😅 Đợi khoảng một phút rồi hỏi tiếp nhé.")
    if per_day >= daily_limit:
        detail = (
            f"Bạn đã dùng hết {daily_limit} câu hỏi hôm nay ở chế độ khách. Tạo tài khoản miễn phí để hỏi Mầm nhiều hơn."
            if user.is_anonymous
            else f"Bạn đã hỏi Mầm {daily_limit} câu hôm nay. Hẹn gặp lại bạn ngày mai nhé!"
        )
        raise HTTPException(429, detail)
    event_id = await db.record_tutor_event(user.id)

    history = [t.model_dump() for t in req.history[-MAX_HISTORY:]]
    while history and history[0]["role"] != "user":
        history.pop(0)

    async def on_usage(input_tokens: int, output_tokens: int) -> None:
        await db.set_tutor_usage(event_id, input_tokens, output_tokens)

    return StreamingResponse(
        stream_reply(req.message, history, req.context, on_usage),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# --- classes ---


class ClassBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class JoinBody(BaseModel):
    code: str = Field(min_length=4, max_length=12)


def _uuid(value: str) -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError as e:
        raise HTTPException(404, "not found") from e


def _require_account(user: AuthUser) -> None:
    if user.is_anonymous:
        raise HTTPException(403, "Bạn cần tạo tài khoản trước khi tham gia hoặc tạo lớp học.")


@app.get("/api/classes")
async def list_classes(user: AuthUser = Depends(current_user)):
    return await db.my_classes(user.id)


@app.post("/api/classes")
async def create_class(body: ClassBody, user: AuthUser = Depends(current_user)):
    _require_account(user)
    return await db.create_class(user.id, body.name.strip())


@app.post("/api/classes/join")
async def join_class(body: JoinBody, user: AuthUser = Depends(current_user)):
    _require_account(user)
    try:
        return await db.join_class(user.id, body.code.strip())
    except LookupError as e:
        raise HTTPException(404, str(e)) from e
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@app.delete("/api/classes/{class_id}/membership", status_code=204)
async def leave_class(class_id: str, user: AuthUser = Depends(current_user)):
    await db.leave_class(user.id, _uuid(class_id))


@app.get("/api/classes/{class_id}")
async def class_report(class_id: str, user: AuthUser = Depends(current_user)):
    try:
        return await db.class_report(user.id, _uuid(class_id), await _board_or_empty())
    except LookupError as e:
        raise HTTPException(404, str(e)) from e
