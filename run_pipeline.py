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

    for msg in new_messages:
        result = ex.process_email(
            client, schema, system_prompt, msg["body_text"], msg["internet_message_id"]
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
