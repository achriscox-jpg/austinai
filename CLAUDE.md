# CLAUDE.md — Standing Instructions for This Repo

## What this project is
Chris Cox is building a tool that reads a batch of shelter-staff written communications — emails, shift reports, meeting summaries, and similar sources, from case managers, front-line staff, supervisors, and others — extracts the outcomes mentioned in them (completed vs. in-progress/needs follow-up), and writes new ones into his outcomes tracking spreadsheet (`Outcomes.xls`) — replacing the manual copy/note step he currently does by hand.

**Source of truth, in this order:** [`brief.md`](./brief.md) → [`PRD.md`](./PRD.md) → this file. If anything here or in the PRD conflicts with `brief.md`, `brief.md` wins — ask before resolving it any other way.

## Extraction rules
- **Do not invent outcomes.** Only extract an outcome if the email actually states it.
- **When not 100% certain an outcome is completed, place it in follow-up instead.** Default to under-claiming, not over-claiming.

## Hard boundaries — do not cross without being asked
- **Never write to HMIS.** This project reads from email and writes only to Chris's own tracking spreadsheet. HMIS is a live case-management system and is permanently out of scope — not a "later" item, not a stretch goal, not a suggestion to make.
- **Don't add Slack, new-guest tracking, a dashboard, or anything else on the roadmap** unless Chris explicitly asks to pull it into V1. Those are deliberately deferred — see `brief.md`'s Roadmap section and `PRD.md` §5.
- **Don't invent scope.** If a feature isn't in `brief.md` or `PRD.md`, treat it as not requested, even if it seems like a natural extension.

## Data handling
- Emails and spreadsheets in this project contain real guest information from an emergency shelter. Treat any non-redacted data as sensitive: don't print full contents into chat unnecessarily, don't commit real (non-redacted) guest data to git.
- `.env` exists in this repo and is untracked — keep it that way. Never commit secrets or API keys.

## When editing the planning docs
- `brief.md` is the one-page source of truth. Keep edits to it tight — it should stay one page.
- `PRD.md` and `README.md` are derived from `brief.md`. If you update `brief.md`, check whether `PRD.md` and `README.md` need the same update to stay consistent — don't let them drift.
- Match the existing tone: plain, concrete, no marketing language, numbers over adjectives.
