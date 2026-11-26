"""Trendyol istemcisi: salt okunur kilit, yeniden deneme, devre kesici, sayfalama, önbellek."""
import httpx
import pytest

from boz_mcp.trendyol.client import TrendyolClient, TrendyolError, WriteBlocked
from boz_mcp.trendyol.endpoints import ENDPOINTS


@pytest.mark.asyncio
async def test_unknown_or_write_endpoint_blocked(client):
    with pytest.raises(WriteBlocked):
        await client.request("price_and_inventory_update")
    for ep in ENDPOINTS.values():
        assert ep.read_only
        assert ep.method == "GET" or ep.key == "buybox"
        assert "price-and-inventory" not in ep.path and "/answers" not in ep.path


@pytest.mark.asyncio
async def test_retry_on_429_and_500_then_success(client, fake):
    fake.fail["/products/approved"] = [429, 500]
    data = await client.request("products_v2", {"page": 0, "size": 10})
    assert data["totalElements"] == 3
    assert client.stats["retries"] == 2


@pytest.mark.asyncio
async def test_no_retry_on_400(client, fake):
    fake.fail["/claims"] = [400]
    with pytest.raises(TrendyolError) as e:
        await client.request("claims", {"page": 0, "size": 10})
    assert e.value.status == 400 and not e.value.retryable
    assert client.stats["retries"] == 0


@pytest.mark.asyncio
async def test_connection_error_is_error_not_empty(client, fake):
    fake.timeout_paths.add("/claims")
    with pytest.raises(TrendyolError) as e:
        await client.request("claims", {"page": 0, "size": 10})
    assert e.value.retryable
    assert client.stats["retries"] == client.MAX_RETRIES


@pytest.mark.asyncio
async def test_circuit_breaker_opens(client, fake):
    fake.fail["/claims"] = [503] * 50
    for _ in range(3):
        with pytest.raises(TrendyolError):
            await client.request("claims", {"page": 0, "size": 1})
    calls_before = len(fake.calls)
    with pytest.raises(TrendyolError, match="devre kesici"):
        await client.request("claims", {"page": 0, "size": 1})
    assert len(fake.calls) == calls_before  # devre açıkken API'ye istek gitmez


@pytest.mark.asyncio
async def test_cursor_pagination_never_sends_page_with_token(client, fake):
    from tests.conftest import make_product
    fake.products = [make_product(i) for i in range(1, 251)]
    items = [p async for p in client.paginate("products_v2", {})]
    assert len(items) == 250
    for _, path, q in fake.calls:
        assert not ("nextPageToken" in q and "page" in q)


@pytest.mark.asyncio
async def test_cache(client, fake):
    await client.request("products_v2", {"page": 0, "size": 1}, cache_ttl=60)
    await client.request("products_v2", {"page": 0, "size": 1}, cache_ttl=60)
    assert len(fake.calls) == 1 and client.stats["cache_hits"] == 1


@pytest.mark.asyncio
async def test_missing_credentials(settings, fake):
    settings.api_key = ""
    c = TrendyolClient(settings, transport=httpx.MockTransport(fake.handler))
    with pytest.raises(TrendyolError, match="kimlik"):
        await c.request("products_v2", {})


def test_auth_header_not_in_repr(settings):
    assert "k" != settings.api_key or "api_key" not in repr(settings)
    assert settings.public_view()["credentials"] == "set"
