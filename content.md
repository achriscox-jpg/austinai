# Content Spec — Outcomes Review Tool

*Internal working screen for reviewing outcomes the V1 email extractor pulls out, before and after they land in `Outcomes.xls`. See [brief.md](./brief.md) and [PRD.md](./PRD.md) for full project context. This is not a generic admin panel — it's scoped to Chris's actual daily review workflow.*

## Data model

Two tables, same fields:

**Needs Follow-up**
- ID
- Guest name
- Classification (broad category, e.g. Housing, Employment, Benefits)
- Type (the specific outcome within that category)
- Date
- Case manager
- Source email reference/snippet
- Follow-up detail / notes

**Completed** — same fields, plus:
- Verified in spreadsheet (checkbox)

## Lifecycle

1. The extractor pulls an outcome from email and classifies it as completed or in-progress — new records land in the matching table directly.
2. When a Needs Follow-up record is confirmed done (case manager confirms), it moves to Completed, landing with "verified in spreadsheet" unchecked.
3. Chris checks off "verified in spreadsheet" once he's confirmed it's actually in `Outcomes.xls`.
4. Once checked, the record drops off the list entirely — it doesn't stay around as history. History lives in the spreadsheet, not this tool.

This keeps Completed a short, quick-to-clear queue (expected ~5-10 records at a time), separate from Needs Follow-up, which is the one that actually grows and needs ongoing management.

## Layout

One screen, stacked:
- **Completed** — compact table, top of screen
- **Needs Follow-up** — main table, below, gets the bulk of the screen

No separate detail page. Each row shows all fields inline — the source email snippet and follow-up notes wrap/truncate in the row rather than requiring a drill-in.

## Actions

- Move a record from Needs Follow-up → Completed (once confirmed done)
- Check off "verified in spreadsheet" on a Completed record (record then drops off the list)
- Manually add a record to either table (for outcomes the extractor missed or Chris learned outside of email)
- Edit a record's fields (fix something the extractor got wrong before it's trusted or acted on)
- Delete/dismiss a record (extracted in error, shouldn't be tracked)

## Explicitly not included (for now)

- No filter/search on the Needs Follow-up list
- No board view
- No detail page / drill-in per record
