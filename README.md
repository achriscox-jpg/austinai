# Email Outcome Tracker *(working title)*

*Chris Cox · MakerSquare · Cohort 2*

## The problem

Email and the shelter's HMIS database are separate systems that don't interface with each other, so outcomes reported by email can get missed or forgotten before they make it into HMIS — and catching those requires tracking and reconciling everything by hand.

At the Adult Emergency Shelter (200+ guests served daily), that means at least an hour a day spent reading emails for outcome/follow-up mentions, plus following up with case managers to confirm what actually happened.

## What this is

A tool that reads a batch of case-manager emails, pulls out the outcomes mentioned in them (completed, or in-progress/needs follow-up), and writes the new ones straight into Chris's outcomes tracking tool — replacing the manual copy/note-from-email-into-a-spreadsheet step he does today.

**It reads from:** case-manager emails + `Outcomes.xls` (the file listing every outcome the shelter tracks, used to categorize each extracted outcome by Classification/Type)
**It writes to:** the tracking tool itself — this fully replaces `Outcomes.xls` as the destination, nothing else
**It does not write to:** HMIS, at any stage. HMIS is a live case-management system this project never touches.

## Status

V1, in progress. Two-week build.

## Docs

- [`brief.md`](./brief.md) — the one-page project brief: problem, V1 scope, roadmap, success criteria
- [`PRD.md`](./PRD.md) — the fuller spec, expanded from the brief
- [`CLAUDE.md`](./CLAUDE.md) — standing instructions for working in this repo with Claude

## Roadmap (not in V1, not now)

Slack → tracking tool for the Family Shelter, new-guest registration tracking, guest needs/follow-up tracking, a broader case-manager dashboard, and the rest of the automation wishlist. See `brief.md` and `PRD.md` for the full list.

## Data

Working materials (case-manager emails, `Outcomes.xls`) contain guest information and are used in redacted form only.
