import ssl as _ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings


def _build_engine_args() -> tuple[str, dict]:
    url = get_settings().database_url
    connect_args: dict = {}

    if url.startswith(("postgres://", "postgresql://")) and "asyncpg" not in url:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)

        need_ssl = qs.pop("sslmode", [None])[0] in ("require", "verify-ca", "verify-full")

        clean_query = urlencode({k: v[0] for k, v in qs.items()})
        new_url = urlunparse(parsed._replace(
            scheme="postgresql+asyncpg",
            query=clean_query,
        ))

        if need_ssl:
            ctx = _ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = _ssl.CERT_NONE
            connect_args["ssl"] = ctx

        return new_url, connect_args

    return url, connect_args


_url, _connect_args = _build_engine_args()
engine = create_async_engine(_url, echo=False, connect_args=_connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
