"""Verify Supabase access tokens.

Asymmetric (ES256/RS256) tokens are verified locally against the project's JWKS. Projects
still on the legacy HS256 secret have no JWKS keys, so those tokens are checked with the
Auth server instead, as Supabase recommends.
"""

import asyncio
import hashlib
import time
from dataclasses import dataclass

import httpx
import jwt
from fastapi import Header, HTTPException

from .settings import SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL

ISSUER = f"{SUPABASE_URL}/auth/v1"
_jwks = jwt.PyJWKClient(f"{ISSUER}/.well-known/jwks.json", cache_jwk_set=True, lifespan=600)
_remote_cache: dict[str, tuple[float, "AuthUser"]] = {}
REMOTE_CACHE_S = 60


@dataclass(frozen=True)
class AuthUser:
    id: str
    is_anonymous: bool
    email: str | None


def _unauthorized(detail: str = "invalid or expired session") -> HTTPException:
    return HTTPException(401, detail, headers={"WWW-Authenticate": "Bearer"})


async def _verify_jwks(token: str) -> AuthUser:
    try:
        key = await asyncio.to_thread(_jwks.get_signing_key_from_jwt, token)
        claims = jwt.decode(token, key.key, algorithms=["ES256", "RS256"], audience="authenticated", issuer=ISSUER)
    except jwt.PyJWTError as e:
        raise _unauthorized() from e
    return AuthUser(claims["sub"], bool(claims.get("is_anonymous")), claims.get("email") or None)


async def _verify_remote(token: str) -> AuthUser:
    digest = hashlib.sha256(token.encode()).hexdigest()
    hit = _remote_cache.get(digest)
    if hit and time.monotonic() - hit[0] < REMOTE_CACHE_S:
        return hit[1]
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{ISSUER}/user", headers={"apikey": SUPABASE_PUBLISHABLE_KEY, "Authorization": f"Bearer {token}"})
    if r.status_code != 200:
        raise _unauthorized()
    data = r.json()
    user = AuthUser(data["id"], bool(data.get("is_anonymous")), data.get("email") or None)
    _remote_cache[digest] = (time.monotonic(), user)
    return user


async def current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized("missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except jwt.PyJWTError as e:
        raise _unauthorized() from e
    if alg == "HS256":
        return await _verify_remote(token)
    return await _verify_jwks(token)
