"""Shared security helpers for the sidecar (no third-party imports on purpose)."""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse


def _is_public_ip(raw: str) -> bool:
    try:
        ip = ipaddress.ip_address(raw.split("%")[0])
    except ValueError:
        return False
    # IPv4-mapped IPv6 (::ffff:127.0.0.1) must be judged by the embedded IPv4 address.
    mapped = getattr(ip, "ipv4_mapped", None)
    if mapped is not None:
        ip = mapped
    # `is_global` is False for private, loopback, link-local (incl. 169.254.169.254),
    # CGNAT 100.64/10, reserved, multicast and unspecified addresses.
    return ip.is_global and not ip.is_multicast


def ensure_public_url(url: str) -> str:
    """Raise ValueError unless `url` is an http(s) URL whose host resolves only to public addresses."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https")
    if parsed.username or parsed.password:
        raise ValueError("URL must not contain credentials")
    host = parsed.hostname
    if not host:
        raise ValueError("URL has no host")

    lowered = host.lower().rstrip(".")
    if lowered == "localhost" or lowered.endswith((".localhost", ".local", ".internal")):
        raise ValueError("Refusing to fetch an internal host")

    try:
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Cannot resolve host: {host}") from exc

    addresses = {info[4][0] for info in infos}
    if not addresses or not all(_is_public_ip(a) for a in addresses):
        raise ValueError("Refusing to fetch a private/internal address")
    return url
