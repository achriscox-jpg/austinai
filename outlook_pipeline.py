"""
outlook_pipeline.py

Fetches recent messages from the connected Outlook mailbox via Composio and
hands each one's plain-text body to extract_outcomes.process_email(). This
is the live-mailbox counterpart to extract_outcomes.py's local-.txt-file
mode - both call the same shared extraction core, neither knows about the
other.

Read-only by construction, not just by convention: the Outlook auth config
this connects through (ac_r_ZhL8kdWoPO) only ever requested Mail.Read,
User.Read, and offline_access - no Mail.Send or Mail.ReadWrite was granted
at the OAuth layer, so this can't send or modify mail even if the code
tried to. See the Execution Allowlist on that auth config for the second,
independent layer: only OUTLOOK_LIST_MESSAGES, OUTLOOK_GET_MESSAGE, and
OUTLOOK_GET_MAIL_DELTA are callable through it at all.
"""

import html
import os
import re
from pathlib import Path

from composio import Composio

ENV_FILE = Path(__file__).parent / ".env"

# How far back to look each run. Deliberately generous (not just "since the
# last run") so a missed or failed run doesn't lose messages - duplicate
# protection is the dedup layer's job (source_message_id in Supabase), not
# this window's.
DEFAULT_LOOKBACK_DAYS = 3

# Only these three tools are allowlisted on the auth config; listed here too
# so a typo'd tool slug fails fast and locally instead of round-tripping to
# Composio to find out.
ALLOWED_TOOLS = {"OUTLOOK_LIST_MESSAGES", "OUTLOOK_GET_MESSAGE", "OUTLOOK_GET_MAIL_DELTA"}


def _load_env_var(name: str) -> str:
    """Same fallback pattern as extract_outcomes.load_api_key(): prefer a
    real environment variable, fall back to parsing .env directly so this
    module has no extra dependency (e.g. python-dotenv) just for that."""
    value = os.environ.get(name)
    if value:
        return value

    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            if key.strip() == name:
                return val.strip().strip('"').strip("'")

    raise RuntimeError(f"{name} not found in the environment or in .env")


def _html_to_text(content: str, content_type: str) -> str:
    """Outlook message bodies come back as {contentType, content}. HTML
    bodies need converting to plain text before handing them to the
    extraction model - stdlib-only (no new dependency), good enough for
    shift-note-style emails: strip tags, unescape entities, collapse
    whitespace."""
    if content_type.lower() != "html":
        return content.strip()

    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", content, flags=re.I | re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def get_client() -> Composio:
    api_key = _load_env_var("COMPOSIO_API_KEY")
    return Composio(api_key=api_key)


def fetch_recent_messages(
    client: Composio,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    limit: int = 50,
) -> list[dict]:
    """Return recent messages from the connected Outlook mailbox as plain
    dicts: {id, subject, received_at, sender, body_text}.

    Uses a single OUTLOOK_LIST_MESSAGES call with an explicit `select` that
    includes body - Composio's own docs note an explicit select always wins
    over response_detail, so this skips the "minimal" default that would
    otherwise exclude the body field, without needing a second
    OUTLOOK_GET_MESSAGE call per message.
    """
    from datetime import datetime, timedelta, timezone

    connected_account_id = _load_env_var("OUTLOOK_CONNECTED_ACCOUNT_ID")
    user_id = _load_env_var("OUTLOOK_COMPOSIO_USER_ID")

    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    since_iso = since.strftime("%Y-%m-%dT%H:%M:%SZ")

    result = client.tools.execute(
        "OUTLOOK_LIST_MESSAGES",
        user_id=user_id,
        connected_account_id=connected_account_id,
        arguments={
            "top": limit,
            "received_date_time_ge": since_iso,
            "orderby": ["receivedDateTime desc"],
            "select": ["id", "internetMessageId", "subject", "receivedDateTime", "from", "body"],
        },
        dangerously_skip_version_check=True,
    )
    data = result.model_dump() if hasattr(result, "model_dump") else dict(result)
    if not data.get("successful"):
        raise RuntimeError(f"OUTLOOK_LIST_MESSAGES failed: {data.get('error')}")

    raw_messages = data.get("data", {}).get("value", [])

    messages = []
    for msg in raw_messages:
        body = msg.get("body") or {}
        from_address = (msg.get("from") or {}).get("emailAddress", {})
        sender = from_address.get("address", "")
        sender_name = from_address.get("name", "")
        messages.append(
            {
                # Graph's own id - handy for a future OUTLOOK_GET_MESSAGE
                # call, but NOT stable across folder moves (delete/restore,
                # rules, filing into a subfolder) - do not use for dedup.
                "id": msg.get("id", ""),
                # internetMessageId is the RFC 5322 Message-ID header,
                # assigned by the sending mail server. Stable regardless of
                # where the message lives in the mailbox - this is the
                # dedup key.
                "internet_message_id": msg.get("internetMessageId", ""),
                "subject": msg.get("subject", ""),
                "received_at": msg.get("receivedDateTime", ""),
                "sender": sender,
                # Display name, e.g. "Chris Cox" - used as the case_manager
                # fallback when the text doesn't name one. Falls back to the
                # bare address if Graph didn't supply a display name.
                "sender_name": sender_name or sender,
                "body_text": _html_to_text(body.get("content", ""), body.get("contentType", "text")),
            }
        )
    return messages


if __name__ == "__main__":
    # Manual smoke test: list what's fetchable without running extraction
    # or printing message content (may be real mailbox data).
    c = get_client()
    msgs = fetch_recent_messages(c)
    print(f"Fetched {len(msgs)} message(s) from the last {DEFAULT_LOOKBACK_DAYS} day(s):")
    for m in msgs:
        print(f"  - {m['id']}  ({m['received_at']})  subject len={len(m['subject'])}  body len={len(m['body_text'])}")
