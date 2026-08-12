"""
run_pipeline.py

The live-mailbox pipeline: fetch recent Outlook messages -> skip anything
already processed -> extract outcomes -> write new ones to Supabase. This
is what a schedule would eventually invoke; for now it's a manual entry
point, run with `python run_pipeline.py` (add --dry-run to extract and
print without writing anything to Supabase).

Ties together three independent pieces, none of which know about each
other directly:
    outlook_pipeline.py   - fetch (read-only Outlook connection)
    extract_outcomes.py   - the shared extraction core (process_email)
    supabase_writer.py    - dedup check + write

On verification flags: the second-pass verify step in extract_outcomes.py
only flags possible problems, it doesn't invalidate a record. There is no
"needs review" column in the outcomes table today, so flagged outcomes are
still written - silently dropping them would mean a real outcome never
reaches the dashboard at all, which is a worse failure than one that reaches
it and gets a second look. Flags are printed to the run log either way.
"""

import sys

from anthropic import Anthropic

import extract_outcomes as ex
import outlook_pipeline as op
import supabase_writer as sw


def run(lookback_days: int = op.DEFAULT_LOOKBACK_DAYS, dry_run: bool = False) -> None:
    anthropic_key = ex.load_api_key()
    client = Anthropic(api_key=anthropic_key)

    classifications, types, taxonomy_reference = ex.load_taxonomy()
    schema = ex.build_schema(classifications, types)
    system_prompt = ex.build_system_prompt(taxonomy_reference)

    composio_client = op.get_client()
    messages = op.fetch_recent_messages(composio_client, lookback_days=lookback_days)
    print(f"Fetched {len(messages)} message(s) from the last {lookback_days} day(s).")

    new_messages = [m for m in messages if not sw.message_already_processed(m["internet_message_id"])]
    skipped = len(messages) - len(new_messages)
    if skipped:
        print(f"Skipping {skipped} already-processed message(s).")

    total_written = 0
    total_flagged = 0

    # messages (and therefore new_messages) come back newest-received-first
    # from op.fetch_recent_messages (orderby receivedDateTime desc). Insert
    # oldest-to-newest instead - each insert_outcomes() call gets its own
    # created_at, so processing newest-first would write the newest email's
    # outcomes with the EARLIEST created_at of the run and the oldest
    # email's outcomes with the LATEST, inverting the dashboard's
    # newest-added-first sort within every run that catches up more than
    # one message at once. See extraction-rules.md's session log for the
    # observed case (2026-08-12: a case manager's whole batch sorted to the
    # bottom of same-run results despite being the most recently emailed).
    for msg in reversed(new_messages):
        # received_at is a full ISO 8601 timestamp (e.g.
        # "2026-08-11T02:31:03Z") - the date_identified fallback just wants
        # the date portion, which is always the first 10 characters of that
        # format.
        result = ex.process_email(
            client,
            schema,
            system_prompt,
            msg["body_text"],
            msg["internet_message_id"],
            sent_date=msg["received_at"][:10],
            case_manager_fallback=msg["sender_name"],
        )
        outcomes = result["outcomes"]
        verification = result["verification"]

        print(f"\n=== message {msg['internet_message_id']} ({msg['received_at']}) ===")
        if not outcomes:
            print("(no outcomes found)")
            if not dry_run:
                # Record the check even though there's nothing to write -
                # otherwise a message with zero outcomes never gets marked
                # processed, and gets re-extracted on every run within the
                # lookback window for as long as it's in that window.
                sw.mark_message_processed(msg["internet_message_id"], outcomes_found=0)
            continue

        flags = verification.get("flags", [])
        if flags or not verification.get("pass", True):
            total_flagged += 1
            print("VERIFY: FLAGGED (writing anyway - see module docstring)")
            for flag in flags:
                print(f"  - {flag}")
        else:
            print("VERIFY: PASS")

        rows = [sw.outcome_to_row(o, msg["internet_message_id"]) for o in outcomes]
        if dry_run:
            print(f"DRY RUN: would insert {len(rows)} outcome(s), not writing")
        else:
            inserted = sw.insert_outcomes(rows)
            print(f"Inserted {len(inserted)} outcome(s).")
            total_written += len(inserted)
            sw.mark_message_processed(msg["internet_message_id"], outcomes_found=len(inserted))

    print(
        f"\nDone. {len(new_messages)} new message(s) processed, "
        f"{total_written} outcome(s) written, {total_flagged} message(s) flagged."
    )


if __name__ == "__main__":
    run(dry_run="--dry-run" in sys.argv)
