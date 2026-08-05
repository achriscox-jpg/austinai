# Content Spec — Outcomes Review Tool

*This tool is the destination itself — where the V1 email extractor writes outcomes, and where Chris reviews/manages them. It replaces `Outcomes.xls` as the tracking system; `Outcomes.xls` now only supplies the Classification/Type taxonomy. See [brief.md](./brief.md) and [PRD.md](./PRD.md) for full project context. This is not a generic admin panel — it's scoped to Chris's actual daily review workflow.*

## Data model

Two tables, same fields:

**Needs Follow-up**
- ID
- Guest name
- Classification (broad category) — dropdown, sourced from the shelter's outcome taxonomy (`Outcomes renamed headers.xls`)
- Type (the specific outcome within that category) — dropdown, options narrow to match the chosen Classification
- Date
- Case manager
- Source email reference/snippet
- Follow-up detail / notes

**Completed** — same fields, plus:
- Documented in HMIS (checkbox)

## Lifecycle

1. The extractor pulls an outcome from email and classifies it as completed or in-progress — new records land in the matching table directly.
2. When a Needs Follow-up record is confirmed done (case manager confirms), it moves to Completed, landing with "documented in HMIS" unchecked.
3. Chris checks off "documented in HMIS" once he's confirmed it's actually been entered there.
4. Once checked, the record drops off the list entirely — it doesn't stay around as history. History lives in HMIS, not this tool.

This keeps Completed a short, quick-to-clear queue (expected ~5-10 records at a time), separate from Needs Follow-up, which is the one that actually grows and needs ongoing management.

## Layout

One screen, stacked:
- **Completed** — compact table, top of screen
- **Needs Follow-up** — main table, below, gets the bulk of the screen

No separate detail page. Each row shows all fields inline — the source email snippet and follow-up notes wrap/truncate in the row rather than requiring a drill-in.

## Actions

- Move a record from Needs Follow-up → Completed (once confirmed done)
- Move a record from Completed → Needs Follow-up (if it turns out it wasn't actually done, or was marked complete in error)
- Check off "documented in HMIS" on a Completed record (record then drops off the list)
- Manually add a record to either table (for outcomes the extractor missed or Chris learned outside of email)
- Edit a record's fields (fix something the extractor got wrong before it's trusted or acted on)
- Delete/dismiss a record (extracted in error, shouldn't be tracked) — deletes immediately with a brief "Undo" toast rather than a confirm dialog

## Reconciliation (heads-up, not automatic)

A separate page (`reconcile.html`) lets Chris upload a manually-run, PII-redacted CSV report of
already-logged outcomes (e.g. from HMIS) and check it against both tables. This is explicitly *not*
an automatic dedup — it flags possible matches (same Guest ID + Classification + Type) for Chris to
review by hand; nothing is moved, checked off, or deleted automatically.

- Matches against **both** Needs Follow-up and Completed
- Only CSV is supported — an `.xls`/`.xlsx` upload is rejected with a message to re-export as CSV first
- Expected columns: Guest ID, Classification, Type (header names matched loosely)
- The uploaded file is never saved — it's parsed in the browser for one comparison pass and discarded
- Matches are marked directly on the record with a small warning (⚠) badge in a dedicated column on
  both tables, so the flag is visible back on the main Outcomes page, not just in the Reconcile page's
  results list. Clicking the badge dismisses it — a human decision, not automatic.
- Each new reconciliation run clears flags from the previous run before applying fresh ones, so nothing
  stale lingers from an older report

## Explicitly not included (for now)

- No filter/search on the Needs Follow-up list
- No board view
- No detail page / drill-in per record
- No automatic deduplication — reconciliation is a manual, human-reviewed heads-up only
