"""
supabase_writer.py

Writes extracted outcomes into the same Supabase `outcomes` table the
Outcomes Review Tool dashboard reads from (see config.js, script.js).
Uses the same publishable key the browser dashboard already uses for
inserts (client-side "Add outcome" and undo-delete both go through it) -
confirmed working, so no service_role key needed.

Field mapping from a process_email() outcome record to a DB row - this is
the one place that mapping lives, so it can't drift out of sync with
mapToDb() in script.js by accident:

    guest_id          -> guest_id
    guest_name        -> guest_name
    classification    -> classification
    type              -> type
    status            -> status, "needs follow-up" converted to
                         "needs_follow_up" (the DB's check constraint only
                         allows the underscored form; the model is never
                         asked to produce that form directly)
    date_identified   -> date_identified
    case_manager      -> case_manager
    supporting_text   -> source_email  (a supporting quote, per Chris -
                         NOT the same thing as source_id below, despite
                         the confusingly-shared "source_email" name)
    source_id         -> source_message_id  (the Outlook message id this
                         outcome came from - the dedup key, never shown in
                         the dashboard UI)
    review_notes      -> review_notes  (the verify step's flags for the
                         WHOLE EMAIL this outcome came from, joined into one
                         string - NULL when verify passed clean. Powers the
                         dashboard's per-record confidence badge alongside
                         blank classification/type - see script.js's
                         confidenceBadgeHtml.)
    (not set)         -> notes, next_action_date, possible_match
                         (dashboard-only fields; automation never writes
                         these - notes and next_action_date are left out of
                         the insert entirely so their DB defaults apply,
                         and possible_match defaults to false)
"""

import os
from pathlib import Path

import httpx

ENV_FILE = Path(__file__).parent / ".env"

STATUS_MAP = {
    "completed": "completed",
    "needs follow-up": "needs_follow_up",
}


def _load_env_var(name: str) -> str:
    """Same fallback pattern used throughout this project: prefer a real
    environment variable, fall back to parsing .env directly."""
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


def _client() -> tuple[httpx.Client, str]:
    url = _load_env_var("SUPABASE_URL").rstrip("/")
    key = _load_env_var("SUPABASE_KEY")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    return httpx.Client(base_url=f"{url}/rest/v1", headers=headers, timeout=15.0), key


def outcome_to_row(outcome: dict, source_id: str, review_notes: str = "") -> dict:
    """Map one process_email() outcome record to an outcomes table row.

    review_notes is the verify step's flags for the EMAIL this outcome came
    from (not per-outcome - the verify call checks a whole email's outcomes
    together and returns one flags list, not a flag-to-outcome mapping), so
    every outcome from a flagged email gets the same note. Coarser than
    per-record attribution, but honest: if verify wasn't sure about anything
    in this batch, treating the whole batch as worth a second look is the
    same under-claim-rather-than-over-claim posture used everywhere else in
    this pipeline. Empty string (-> NULL) when verify passed clean.
    """
    status = outcome.get("status", "")
    if status not in STATUS_MAP:
        raise ValueError(f"Unrecognized status {status!r} - expected one of {list(STATUS_MAP)}")

    return {
        "guest_id": outcome.get("guest_id") or None,
        "guest_name": outcome.get("guest_name") or "",
        "classification": outcome.get("classification") or "",
        "type": outcome.get("type") or "",
        "status": STATUS_MAP[status],
        "date_identified": outcome.get("date_identified") or None,
        "case_manager": outcome.get("case_manager") or None,
        "source_email": outcome.get("supporting_text") or None,
        "source_message_id": source_id or None,
        "review_notes": review_notes or None,
    }


def message_already_processed(message_id: str) -> bool:
    """Dedup check: has this message already been looked at, regardless of
    whether it produced any outcomes? Backed by processed_messages, a
    separate bookkeeping table - NOT the outcomes table, because a message
    that yields zero outcomes never writes a row there, and would otherwise
    get re-extracted on every run within the lookback window forever.
    """
    client, _ = _client()
    with client:
        resp = client.get(
            "/processed_messages",
            params={"select": "message_id", "message_id": f"eq.{message_id}", "limit": 1},
        )
        resp.raise_for_status()
        return len(resp.json()) > 0


def mark_message_processed(message_id: str, outcomes_found: int) -> None:
    """Record that a message has been checked, whether or not it produced
    any outcomes. Call this once per message after extraction, regardless
    of outcome count - this is what makes message_already_processed() work
    for the zero-outcomes case."""
    if not message_id:
        return
    client, _ = _client()
    with client:
        resp = client.post(
            "/processed_messages",
            json={"message_id": message_id, "outcomes_found": outcomes_found},
            headers={"Prefer": "resolution=ignore-duplicates"},
        )
        resp.raise_for_status()


def insert_outcomes(rows: list[dict]) -> list[dict]:
    """Insert new outcome rows. Returns the inserted rows (with their new
    ids) on success. Raises on any HTTP-level failure - a message can
    legitimately produce several outcome rows, so nothing here enforces
    uniqueness on source_message_id; message_already_processed() plus
    mark_message_processed() are what prevent reprocessing a message, not
    a DB constraint on this table."""
    if not rows:
        return []

    client, _ = _client()
    with client:
        resp = client.post(
            "/outcomes",
            json=rows,
            headers={"Prefer": "return=representation"},
        )
        resp.raise_for_status()
        return resp.json()


if __name__ == "__main__":
    # Manual smoke test: confirm read access and the dedup check work,
    # without inserting anything.
    client, _ = _client()
    with client:
        resp = client.get("/outcomes", params={"select": "id", "limit": 1})
        resp.raise_for_status()
        print(f"Read OK - table reachable, {len(resp.json())} row(s) in test query.")
    print("message_already_processed('nonexistent-id'):", message_already_processed("nonexistent-id-xyz"))
