# Project Brief — Chris Cox
*MakerSquare · Cohort 2 · Built from pre-work Sections 1–2 & 4*

## The Problem
Shelter-staff communications (email, shift reports, meeting summaries — from case managers, front-line staff, supervisors, and others) and the shelter's HMIS database are separate systems that don't interface with each other, so outcomes reported in those communications can get missed or forgotten before they make it into HMIS — and catching those requires tracking and reconciling everything by hand.

## Who Has It, and How Badly
**Chris Cox**, at the Adult Emergency Shelter (200+ guests served daily). Staff communications and HMIS "do not speak to each other," so he:
- Spends **at least 1 hour every day** reading emails for outcome/follow-up keywords
- Has to **follow up with case managers** to confirm if outcomes were achieved
- If he falls behind, the shelter **misses grant-reportable outcomes** — real work that happened but was never logged where it counts

His own definition of solved: *"a tool that pulls confirmed and potential future outcomes out of emails so I stop tracking everything myself."*

## V1 — The Smallest Real Version (Two Weeks)
**An outcome extractor that writes straight into Chris's outcomes tracking tool — replacing the manual copy/note-from-email-into-a-spreadsheet step.**

1. **Input:** a batch of shelter-staff written communications — emails, shift reports, meeting summaries, and similar sources, from case managers, front-line staff, supervisors, and others (like the redacted samples) + `Outcomes.xls`, the file Chris provided that lists every outcome the shelter tracks — used to categorize each extracted outcome by Classification/Type
2. **Extract:** pull outcome mentions from that text, split into **completed** vs. **in-progress / needs follow-up** — this split already worked in his prompting exercises
3. **Write:** add each new outcome into the tracking tool, filed under the right Classification/Type — this replaces the manual copy-into-spreadsheet step Chris currently does by hand
4. **Output:** the updated tracking tool, plus a short "here's what I added" summary so Chris is reviewing a change log, not retyping from raw emails

**Also included:** a manual reconciliation check — Chris can upload a redacted CSV export of already-logged outcomes (e.g. run from HMIS) and the tool flags possible matches (same guest, same outcome) already sitting in either table. This is a heads-up for human review, not automatic deduplication — nothing moves, gets checked off, or gets deleted on its own.

**Deliberately left out of V1** (see roadmap): Slack, new-guest tracking, and the broader case-manager dashboard (roadmap item 4 — length-of-stay + guest needs; a different, later thing from this V1 tracking tool). Writing into HMIS itself isn't on the table at all — it's a live case-management system, not something this tool writes to at any stage. Chris's own tracking tool is his working system now (no more `Outcomes.xls` as the destination — it fully replaces it), so writing to it directly is the right amount of automation for two weeks. This keeps V1 to one data source (shelter-staff written communications), one destination (his tracking tool), and one output (an updated record + change log) — buildable and testable against real redacted data he already has in hand.

## Roadmap — Not Building Now, Building Later
1. **Slack → tracking tool** for the Family Shelter (same pattern as V1, different channel)
2. **New-guest registration tracking** from email, for data-quality checks
3. **Guest needs & follow-up tracking not yet tracked anywhere** — ID, birth certificate, SS card, evictions, outstanding utility bills
4. **Broader case-manager dashboard**: length-of-stay + specific guest needs, to help move guests toward independent living (distinct from the V1 outcomes tracking tool)
5. **Rest of the wishlist**, roughly in order of stated interest: document-acquisition helper (ID/birth cert/SS card), resume & job-application support, benefits-application assistant, service-connection matching (counseling/financial/SA/DV/MH), case-manager contact-cadence tracking, easy outcome-data sharing with supervisors

## How I'll Know V1 Worked
- Run it against a real batch of shelter-staff communications (emails, shift reports, meeting summaries) + his current tracking tool
- Every outcome Chris would've manually copied into a spreadsheet, the tool adds on its own — nothing missed
- He can point to a batch of shelter-staff communications and never have had to manually log them into the tracking tool
- Soft target: his daily ~1 hour of email-to-spreadsheet copying shrinks because he's reviewing a short "what I added" list instead of retyping from emails
