import time
import logging
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status
from app.config import settings

logger = logging.getLogger("treeguard.rate_limit")

class InMemoryRateLimiter:
    """
    Lightweight, thread-safe in-memory sliding-window rate limiter for FastAPI.
    Tracks timestamps of requests per client IP and endpoint group.
    """
    def __init__(self, max_requests: int, window_seconds: int = 60, name: str = "default"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.name = name
        self._records: Dict[str, List[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        # Check X-Forwarded-For header if behind a reverse proxy, else client.host
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def _cleanup_expired(self, key: str, now: float) -> List[float]:
        cutoff = now - self.window_seconds
        valid = [ts for ts in self._records[key] if ts > cutoff]
        self._records[key] = valid
        return valid

    async def __call__(self, request: Request) -> None:
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return

        client_ip = self._get_client_ip(request)
        key = f"{self.name}:{client_ip}"
        now = time.time()

        valid_timestamps = self._cleanup_expired(key, now)

        if len(valid_timestamps) >= self.max_requests:
            oldest = valid_timestamps[0]
            retry_after = int(self.window_seconds - (now - oldest)) + 1
            logger.warning(
                f"Rate limit exceeded for client {client_ip} on '{self.name}'. "
                f"Count: {len(valid_timestamps)}/{self.max_requests}. Retry-After: {retry_after}s"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": str(max(1, retry_after))},
            )

        self._records[key].append(now)

# Predefined rate limiters for different endpoint sensitivities
rate_limit_auth = InMemoryRateLimiter(max_requests=300, window_seconds=60, name="auth")
rate_limit_uploads = InMemoryRateLimiter(max_requests=150, window_seconds=60, name="uploads")
rate_limit_general = InMemoryRateLimiter(max_requests=1000, window_seconds=60, name="general")
