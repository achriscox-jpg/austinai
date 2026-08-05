# Product Requirements Document — Chris Cox
*Source of truth: [brief.md](./brief.md). This PRD expands the brief into build-level detail; it does not add scope beyond it.*

## 1. Problem
Email and the shelter's HMIS database are separate systems that don't interface with each other, so outcomes reported by email can get missed or forgotten before they make it into HMIS — and catching those requires tracking and reconciling everything by hand.

## 2. Who Has It, and How Badly
Chris Cox, at the Adult Emergency Shelter (200+ guests served daily):
- Spends **at least 1 hour every day** reading emails for outcome/follow-up keywords
- Has to **follow up with case managers** to confirm if outcomes were achieved
- If he falls behind, the shelter **misses grant-reportable outcomes** — real work that happened but was never logged where it counts

**Definition of solved** (Chris's own words): *"a tool that pulls confirmed and potential future outcomes out of emails so I stop tracking everything myself."*

## 3. V1 — What I'll Build in These Two Weeks
**An outcome extractor that writes straight into Chris's outcomes tracking tool — replacing the manual copy/note-from-email-into-a-spreadsheet step.**

| Step | Description |
|---|---|
| Input | A batch of case-manager emails (like the redacted samples) + `Outcomes.xls`, the file Chris provided that lists every outcome the shelter tracks — used to categorize each extracted outcome by Classification/Type |
| Extract | Pull outcome mentions from the emails, split into **completed** vs. **in-progress / needs follow-up** — this split already worked in Chris's prompting exercises |
| Write | Add each new outcome into the tracking tool, filed under the right Classification/Type — this replaces the manual copy-into-spreadsheet step Chris currently does by hand |
| Output | The updated tracking tool, plus a short "here's what I added" summary so Chris is reviewing a change log, not retyping from raw emails |

### Explicitly out of scope for V1
- Slack (Family Shelter channel)
- New-guest registration tracking
- The broader case-manager dashboard (roadmap item 4 — a different, later thing from this V1 tracking tool)
- **Writing into HMIS itself** — not a "later" item, not on the table at any stage. HMIS is a live case-management system this tool never writes to.

V1 is scoped to one data source (email), one destination (Chris's tracking tool — it fully replaces `Outcomes.xls` as the destination), and one output (an updated record + change log) — buildable and testable in two weeks against real redacted data Chris already has in hand.

## 4. Success Criteria — How I'll Know V1 Worked
- Run it against a real batch of case-manager emails + Chris's current tracking tool
- Every outcome Chris would've manually copied into a spreadsheet, the tool adds on its own — nothing missed
- Chris can point to a batch of emails and never have had to manually log them into the tracking tool
- **Soft target:** his daily ~1 hour of email-to-spreadsheet copying shrinks because he's reviewing a short "what I added" list instead of retyping from emails

## 5. Later / Roadmap
Not building now — building later, in roughly the order stated:
1. **Slack → tracking tool** for the Family Shelter (same pattern as V1, different channel)
2. **New-guest registration tracking** from email, for data-quality checks
3. **Guest needs & follow-up tracking not yet tracked anywhere** — ID, birth certificate, SS card, evictions, outstanding utility bills
4. **Broader case-manager dashboard**: length-of-stay + specific guest needs, to help move guests toward independent living (distinct from the V1 outcomes tracking tool)
5. **Rest of the wishlist**: document-acquisition helper (ID/birth cert/SS card), resume & job-application support, benefits-application assistant, service-connection matching (counseling/financial/SA/DV/MH), case-manager contact-cadence tracking, easy outcome-data sharing with supervisors

## 6. Permanently Out of Scope
- **Writing into HMIS.** HMIS is a live case-management system. This project reads from email and writes to Chris's own tracking spreadsheet only — it does not, at any phase (V1 or roadmap), write into HMIS.
