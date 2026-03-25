#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


API_URL = "https://spawn-dock.w3voice.net/knowledge/api/v1/search"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Query the SpawnDock TMA knowledge API."
    )
    parser.add_argument("query", help="Knowledge search query")
    parser.add_argument("--locale", default="en", help="Response locale (default: en)")
    parser.add_argument(
        "--api-token",
        help="Optional Bearer token override. Defaults to SPAWNDOCK_API_TOKEN/API_TOKEN or spawndock.config.json",
    )
    parser.add_argument(
        "--config",
        help="Optional path to spawndock.config.json. Defaults to the nearest config found from cwd upward.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=20.0,
        help="HTTP timeout in seconds (default: 20)",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Print raw JSON response instead of a formatted summary",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Retry count for transient HTTP 5xx failures (default: 2)",
    )
    return parser.parse_args()


def find_config_path(explicit_path: str | None) -> Path | None:
    if explicit_path:
        path = Path(explicit_path).expanduser()
        return path if path.is_file() else None

    for base in [Path.cwd(), *Path.cwd().parents]:
        candidate = base / "spawndock.config.json"
        if candidate.is_file():
            return candidate

    return None


def read_config_api_token(config_path: Path | None) -> str | None:
    if config_path is None:
        return None

    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    token = data.get("apiToken")
    return token.strip() if isinstance(token, str) and token.strip() else None


def resolve_api_token(cli_token: str | None, config_path: Path | None) -> str | None:
    if cli_token and cli_token.strip():
        return cli_token.strip()

    for key in ("SPAWNDOCK_API_TOKEN", "API_TOKEN"):
        value = os.environ.get(key, "").strip()
        if value:
            return value

    return read_config_api_token(config_path)


def request_knowledge(
    query: str,
    locale: str,
    timeout: float,
    retries: int,
    api_token: str | None,
) -> dict:
    payload = json.dumps({"query": query, "locale": locale}).encode("utf-8")
    for attempt in range(retries + 1):
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
        }
        if api_token:
            headers["authorization"] = f"Bearer {api_token}"

        req = urllib.request.Request(
            API_URL,
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return json.loads(response.read().decode(charset))
        except urllib.error.HTTPError as exc:
            if exc.code < 500 or attempt == retries:
                raise
            time.sleep(min(2**attempt, 5))

    raise RuntimeError("Unreachable retry loop")


def format_response(data: dict) -> str:
    lines: list[str] = []
    answer = data.get("answer")
    sources = data.get("sources") or []
    meta = data.get("meta") or {}

    lines.append("Answer:")
    lines.append(answer if answer else "(empty)")

    if sources:
        lines.append("")
        lines.append("Sources:")
        for idx, source in enumerate(sources, start=1):
            if isinstance(source, dict):
                title = source.get("title") or source.get("name") or f"Source {idx}"
                url = source.get("url") or source.get("href") or ""
                snippet = source.get("snippet") or source.get("text") or ""
                line = f"{idx}. {title}"
                if url:
                    line += f" - {url}"
                lines.append(line)
                if snippet:
                    lines.append(f"   {snippet}")
            else:
                lines.append(f"{idx}. {source}")

    if meta:
        lines.append("")
        lines.append("Meta:")
        lines.append(json.dumps(meta, ensure_ascii=False, sort_keys=True))

    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    config_path = find_config_path(args.config)
    api_token = resolve_api_token(args.api_token, config_path)
    try:
        data = request_knowledge(
            args.query,
            args.locale,
            args.timeout,
            args.retries,
            api_token,
        )
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP error: {exc.code}\n{body}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1

    if args.raw:
        print(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(format_response(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
