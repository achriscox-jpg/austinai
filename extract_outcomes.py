"""
extract_outcomes.py

Reads every .txt file in ./emails, sends each one to Claude with a structured-
output schema, and prints the outcome(s) extracted from it plus a second-pass
verification. This is a read-only extraction step: it does NOT write to
Outcomes.xls or HMIS.

The extraction logic here is the accumulated result of reviewing all 5 sample
emails against `Outcomes.xls` line by line (guest by guest) with Chris. The
full reasoning, examples, and edge cases live in extraction-rules.md - this
docstring only summarizes the shape of the output. Read extraction-rules.md
before changing the rules below; keep the two in sync.

One email can produce zero, one, or many outcome records. Each record:
    guest_id         - the guest's ID number, exactly as given in the text.
                        Blank if no ID number is stated - do NOT substitute
                        the guest's name or initials here.
    guest_name        - the guest's name, exactly as it appears in the text.
                        Blank if not stated. Separate from guest_id because
                        the text may give one without the other.
    classification    - one of Outcomes.xls's Classification values (e.g.
                        "Housing", "Employment"), or "" if not confident which
                        one applies.
    type              - one of Outcomes.xls's Type values under that
                        classification, or "" if not confident which one
                        applies. classification and type are independent -
                        either, both, or neither may be blank.
    status            - "completed" or "needs follow-up". Deliberately not
                        called "classification" - that name is reserved for
                        the Outcomes.xls category above.
    date_identified    - the date this was mentioned/identified, as written in
                        the text. Blank from the model if no date is given in
                        the text itself - process_email() then fills it in
                        from the email's own sent date, if one was passed in.
    case_manager      - name of the case manager/staff member associated with
                        this outcome, if stated. Blank from the model if not
                        stated - process_email() then fills it in from the
                        email's sender, if one was passed in.
    supporting_text    - the exact phrase(s) from the email that justify this
                        record. Always required, especially important when
                        classification and/or type are blank, so a human
                        reviewer can make the judgment call themselves.
    source_id          - filename of the source email (or, in a live-mailbox
                        pipeline, a message id). Filled in by this script,
                        not by the model. Not the same thing as the
                        outcomes table's source_email column - see
                        process_email()'s docstring.

Core rules (see extraction-rules.md for the full reasoning and examples):
    - Never invent an outcome the email doesn't actually state or clearly
      imply is in motion.
    - Default to "needs follow-up" over "completed" whenever there's real
      uncertainty - under-claim, never over-claim.
    - classification/type must come from the real Outcomes.xls taxonomy,
      matched by meaning (staff won't use the spreadsheet's exact wording) -
      never invent a category that isn't in the list.
    - When unsure of classification and/or type, leave them blank rather than
      guessing - but still extract the record if a concrete, specific
      activity is happening, with enough supporting_text for a human to
      classify it themselves.
    - Registration/intake of new (non-registered) guests, ordinary shift-note
      narrative (chores, incidents, accommodations), staff speculation about
      what "would be" helpful, vague case-management chatter with no
      identifiable activity, and Annual Assessment/MAP updates are never
      outcomes.

After extraction, a SECOND Claude call verifies the result: it's given the
original text plus the extracted outcome(s) and asked whether every field is
actually supported by the text, and whether anything was missed. This step
only flags problems - it never rewrites or "fixes" the extracted fields.
"""

import json
import os
import sys
from pathlib import Path

from anthropic import Anthropic

MODEL = "claude-opus-5"
EMAILS_DIR = Path(__file__).parent / "emails"
ENV_FILE = Path(__file__).parent / ".env"
TAXONOMY_JSON = Path(__file__).parent / "taxonomy.json"


def load_taxonomy() -> tuple[list[str], list[str], str]:
    """Load the (Classification, Type) taxonomy from taxonomy.json - a
    static, guest-data-free extract of Outcomes.xls's Classification/Type
    columns (see generate_taxonomy.py). Reading from this instead of the
    real (gitignored) Outcomes.xls directly is what lets extraction run in
    CI, which never has the real spreadsheet available.

    Returns (classifications, types, reference_text) - see
    generate_taxonomy.py for what each one is.
    """
    if not TAXONOMY_JSON.exists():
        print(
            f"ERROR: {TAXONOMY_JSON} does not exist - run generate_taxonomy.py "
            "(requires the real Outcomes.xls, so that only works locally).",
            file=sys.stderr,
        )
        sys.exit(1)

    data = json.loads(TAXONOMY_JSON.read_text(encoding="utf-8"))
    return data["classifications"], data["types"], data["reference_text"]


def build_schema(classifications: list[str], types: list[str]) -> dict:
    return {
        "type": "object",
        "properties": {
            "outcomes": {
                "type": "array",
                "description": (
                    "Zero or more outcome records found in this email. Empty "
                    "array if the email describes no outcomes at all."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "guest_id": {
                            "type": "string",
                            "description": (
                                "The guest's ID number, exactly as it "
                                "appears in the text. Empty string if no ID "
                                "number is stated - do NOT use the guest's "
                                "name or initials as a substitute here; "
                                "that belongs in guest_name instead."
                            ),
                        },
                        "guest_name": {
                            "type": "string",
                            "description": (
                                "The guest's name, exactly as it appears in "
                                "the text. Empty string if not stated. "
                                "Independent of guest_id - the text may "
                                "give a name without an ID, an ID without a "
                                "name, both, or neither."
                            ),
                        },
                        "classification": {
                            "type": "string",
                            "enum": classifications + [""],
                            "description": (
                                "Must be one of the exact Classification "
                                "values from the reference taxonomy, or an "
                                "empty string if you are not confident which "
                                "one applies. Never invent a value not in "
                                "the list."
                            ),
                        },
                        "type": {
                            "type": "string",
                            "enum": types + [""],
                            "description": (
                                "Must be one of the exact Type values from "
                                "the reference taxonomy, or an empty string "
                                "if you are not confident which one "
                                "applies. Never invent a value not in the "
                                "list. classification and type are "
                                "independent - it's fine for one, the other, "
                                "both, or neither to be blank. Be "
                                "conservative: if the specific program/"
                                "benefit named in the text doesn't clearly "
                                "match a Type's name (e.g. a 'Free Ride "
                                "Card' is not confidently the same thing as "
                                "'Obtain Reduced Fare ID from RTA' just "
                                "because both are transit benefits), leave "
                                "this blank rather than picking the "
                                "closest-sounding option."
                            ),
                        },
                        "status": {
                            "type": "string",
                            "enum": ["completed", "needs follow-up"],
                            "description": (
                                "\"completed\" only if the text states "
                                "outright that this specific outcome is "
                                "done, AND the stated details are specific "
                                "enough to support the chosen type (e.g. "
                                "employment stated as full-time/part-time/"
                                "temp, not just 'got a job'). \"needs "
                                "follow-up\" otherwise - including when the "
                                "outcome is clearly in progress, pending, "
                                "or when completion is implied but the "
                                "specific type can't be confirmed. Default "
                                "to this when in doubt."
                            ),
                        },
                        "date_identified": {
                            "type": "string",
                            "description": (
                                "The date staff reported/identified this "
                                "update - usually the email's own date "
                                "(from its Date: header), unless the text "
                                "explicitly states a different date this "
                                "specific outcome was achieved. Do NOT use "
                                "a future appointment or event date "
                                "mentioned as part of the outcome (e.g. an "
                                "upcoming DMV appointment or orientation "
                                "date) - that is a different thing from "
                                "when it was identified. Always format as "
                                "YYYY-MM-DD, regardless of how the date "
                                "appears in the source text. Empty string "
                                "only if the email itself has no date at "
                                "all."
                            ),
                        },
                        "case_manager": {
                            "type": "string",
                            "description": (
                                "Name of the case manager or staff member "
                                "associated with this outcome, exactly as "
                                "it appears in the text. Empty string if "
                                "not stated."
                            ),
                        },
                        "supporting_text": {
                            "type": "string",
                            "description": (
                                "The exact phrase(s) from the email that "
                                "justify this record. Required for every "
                                "record - this is what lets a human "
                                "reviewer judge the record, especially "
                                "when classification and/or type are blank."
                            ),
                        },
                    },
                    "required": [
                        "guest_id",
                        "guest_name",
                        "classification",
                        "type",
                        "status",
                        "date_identified",
                        "case_manager",
                        "supporting_text",
                    ],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["outcomes"],
        "additionalProperties": False,
    }


# Shared between the extraction prompt and the verify prompt so both judge by
# the same standard. A verifier that doesn't know these rules will flag
# correct exclusions as "missed" and correct meaning-based taxonomy matches
# as "invented" - that mismatch is exactly what happened in early testing.

NEVER_OUTCOME_RULES = """The following are NEVER outcomes, even if they sound outcome-adjacent:
- ANYTHING involving a guest who is not yet registered (often written as "[Non-Registered Guest]" or similar, with no real Guest ID) - regardless of what's being described for them (identity verification, a referral elsewhere, a bus pass, being given supplies, etc.). They are not yet in the shelter's tracking system, so nothing about them is a trackable outcome yet. This is a blanket exclusion, not limited to registration/intake steps specifically.
- New-guest registration/intake activity (verifying identity, getting checked in for the first time).
- Ordinary shift-note narrative: chores, incidents, behavioral notes, staff accommodations, medical complaints/symptoms with no confirmed outcome tied to a specific taxonomy type.
- Staff speculation about what would help a guest (e.g. "a nursing home would be more beneficial") - not something the guest is actually pursuing.
- Vague case-management chatter with no identifiable specific activity (e.g. "waiting for a call back on next steps", "had a long chat today").
- Annual Assessments and MAP (case plan) updates - always internal paperwork, never a tracked outcome, even when reported as "completed".
- A stated future requirement or precondition the guest has NOT yet started or engaged with (e.g. "must actively engage in anger management ... to be considered for re-entry") - that's a barrier, not something in motion. Only extract once the guest has actually started or is actively pursuing it.
- A guest's employment mentioned only as an existing/ongoing situation - a work schedule, a shift time, a job they're struggling with or want to quit - is NOT a new outcome. Only extract employment when the text signals it was newly obtained/secured.
- An intake/discharge/placement decision made by staff about where a guest will stay (e.g. approving a hospital discharge into the shelter) - that's a shelter operations decision, not a guest outcome."""

TAXONOMY_MATCHING_RULES = """classification and type must be chosen from the fixed taxonomy list by MEANING, not exact wording - shelter staff never use the spreadsheet's exact phrasing. Choosing the closest well-matched taxonomy string is correct and expected, even if it's more specific or uses different words than the source text (e.g. "reunited with his family" matching to "Re-establish positive relationship with immediate family member." is a correct meaning-match, not an invented detail - do not flag this kind of match as unsupported).

Some type values are phrased as an already-achieved state (e.g. "Successful linkage to detox program", "Successful enrollment in youth program"). Only pair such a type with status "completed". If the guest is only pursuing/expecting that outcome (status would be "needs follow-up"), type should be left blank instead of pairing an achievement-phrased type with a not-yet-achieved status - that pairing is a policy violation, not a matter of taste.

A single guest mention can produce more than one outcome record if it plausibly maps to more than one taxonomy type. For example, "reunited with his family" can be both a Support Systems relationship outcome (completed) AND, separately, a Housing outcome if it's unclear whether he also moved in with them (needs follow-up, since the move itself isn't confirmed) - both should be extracted, not collapsed into one."""


def build_system_prompt(taxonomy_reference: str) -> str:
    return f"""You extract outcome records from a single shelter-staff \
communication (email, shift report, or meeting summary), for a homeless \
shelter's outcomes-tracking tool.

An email can describe zero, one, or many outcomes - across multiple guests, \
and multiple outcomes for a single guest. Extract every one you find as a \
separate record in the "outcomes" array.

REFERENCE TAXONOMY - every "classification" and "type" value you use must be \
one of these exact strings (or an empty string if you're not confident which \
one applies). Never invent a classification or type that isn't in this list.

{taxonomy_reference}

TAXONOMY MATCHING:
{TAXONOMY_MATCHING_RULES}

WHEN TO EXTRACT AN OUTCOME AT ALL:
{NEVER_OUTCOME_RULES}
- Extract only when a guest is actually pursuing or has obtained something \
that maps to a specific type in the taxonomy above. "waiting for assisted \
living" IS an outcome - a specific, concrete pursuit.

COMPLETED vs. NEEDS FOLLOW-UP:
- Default to "needs follow-up" whenever there's real uncertainty. \
Under-claim, never over-claim.
- If the specific type is ambiguous given what's stated, that's "needs \
follow-up" even when the underlying fact is stated plainly (e.g. "secured \
employment" with no full-time/part-time/temp stated -> Employment, needs \
follow-up. "working full-time" -> Employment / Obtain FT employment, \
completed, because the text names the specific type).
- Something "in motion" toward a specific type (applied for X, waiting for \
X, has an appointment for X, was given a voucher for X) counts as an \
outcome with status "needs follow-up" - as long as it's the guest's actual \
situation, not staff opinion about what would help them, and not a \
not-yet-started requirement (see the rules above).

WHEN CLASSIFICATION AND/OR TYPE ARE UNCERTAIN:
- If you're confident about classification but not the specific type, or \
the reverse, or neither - still extract the record. Fill in whichever \
field(s) you're confident about, leave the rest as an empty string, set \
status as best you can, and always include supporting_text: the exact \
phrase(s) from the email, with enough context (date/time, what it's for, \
who's involved) that a human reviewer could make the classification \
judgment themselves.
- This still requires a *concrete, specific* activity to be happening (a \
scheduled appointment, a named program, a specific pursuit) - not just \
vague chatter. A doctor's appointment tomorrow with a specific date/time/ \
location is concrete even if you don't know if it's Physical Health or \
Mental Health - extract it with both fields blank. "Waiting to hear next \
steps" with no specifics is not concrete - don't extract it.
- Never guess a specific classification or type just to fill the field. A \
blank field a human can fill in from context is always better than a wrong \
one that looks confident."""


VERIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "pass": {
            "type": "boolean",
            "description": (
                "true only if every non-empty field on every extracted "
                "outcome is directly and clearly supported by the source "
                "text, AND no outcome the text describes was missed "
                "entirely. false otherwise."
            ),
        },
        "flags": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "One short entry per problem found. For an invented/"
                "unsupported value on an existing record: name the guest, "
                "the field, and what the text actually supports (or that "
                "it supports nothing). For a wrongly-blank field: name the "
                "guest, the field, and quote/point to the text that states "
                "it. For a missed outcome: describe the guest and the "
                "outcome that should have been extracted but wasn't. Empty "
                "array if pass is true."
            ),
        },
    },
    "required": ["pass", "flags"],
    "additionalProperties": False,
}

VERIFY_SYSTEM_PROMPT = f"""You are a fact-checker reviewing outcome records that \
another process extracted from a shelter-staff communication, for a \
homeless shelter's outcomes-tracking tool. You must judge the extraction by \
the SAME rules it was extracted under - listed below - not by your own \
generic sense of what counts as supported.

TAXONOMY MATCHING (do not flag a correct application of this as "invented" \
or "overstated" - it is expected and correct):
{TAXONOMY_MATCHING_RULES}

THESE ARE NEVER OUTCOMES - do not flag their absence as a "missed outcome":
{NEVER_OUTCOME_RULES}

With that context, check each extracted record: is every non-empty field \
directly and clearly supported by the text once you account for the \
meaning-based taxonomy matching above - not invented, not guessed, not \
inferred beyond what's actually stated or clearly implied? Also check \
whether the text describes any *bona fide* outcome (per the rules above) \
that was not extracted at all - do not flag the absence of anything covered \
by the "never outcomes" list.

A blank classification or type field is fine and expected when the text is \
genuinely ambiguous - that is not something to flag. Only flag a blank \
field if the text actually states specific enough information that the \
field should have been filled in. Likewise, a status of "needs follow-up" \
on a plainly-stated accomplishment is not automatically wrong - it may be \
correct because the specific type is ambiguous (e.g. unstated employment \
hours) even though the underlying fact is stated; don't flag that pattern \
unless the type actually is specific enough to justify "completed".

Do not correct, rewrite, or suggest replacement values. Your only job is to \
flag problems so a human can review them. If everything checks out, return \
pass: true with an empty flags list."""


def load_api_key() -> str:
    """Return ANTHROPIC_API_KEY from the environment, falling back to
    parsing .env directly so this script has no extra dependencies for
    credentials specifically (pandas/xlrd are still required for the
    Outcomes.xls taxonomy)."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key

    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, _, value = line.partition("=")
            if name.strip() == "ANTHROPIC_API_KEY":
                return value.strip().strip('"').strip("'")

    print(
        "ERROR: ANTHROPIC_API_KEY not found in the environment or in .env",
        file=sys.stderr,
    )
    sys.exit(1)


def extract_outcomes(
    client: Anthropic, email_text: str, schema: dict, system_prompt: str
) -> list[dict]:
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        output_config={
            "effort": "medium",
            "format": {"type": "json_schema", "schema": schema},
        },
        system=system_prompt,
        messages=[{"role": "user", "content": email_text}],
    )

    text_block = next(b for b in response.content if b.type == "text")
    return json.loads(text_block.text)["outcomes"]


def verify_outcomes(client: Anthropic, email_text: str, outcomes: list[dict]) -> dict:
    """Second call: check the extracted outcomes against the source text.
    Flags problems only - never modifies `outcomes`."""
    # source_id is filled in by this script from the filename/message id,
    # not extracted by the model, so there's nothing to verify it against.
    outcomes_to_check = [
        {k: v for k, v in outcome.items() if k != "source_id"}
        for outcome in outcomes
    ]

    user_content = (
        "SOURCE TEXT:\n"
        f"{email_text}\n\n"
        "EXTRACTED OUTCOMES:\n"
        f"{json.dumps(outcomes_to_check, indent=2, ensure_ascii=False)}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        output_config={
            "effort": "medium",
            "format": {"type": "json_schema", "schema": VERIFY_SCHEMA},
        },
        system=VERIFY_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    text_block = next(b for b in response.content if b.type == "text")
    return json.loads(text_block.text)


def process_email(
    client: Anthropic,
    schema: dict,
    system_prompt: str,
    email_text: str,
    source_id: str,
    sent_date: str = "",
    case_manager_fallback: str = "",
) -> dict:
    """Run extraction + verification for one email's text and return a
    single result record. This is the shared core: `main()` below calls it
    once per local .txt file, and the live pipeline (run_pipeline.py) calls
    it once per fetched Outlook message instead - neither caller needs to
    know how the other sources its email text.

    `source_id` is a bookkeeping tag for which file/message this came from
    (a filename here; a Graph message id in the live pipeline) - deliberately
    NOT named source_email, because that name is already taken by a
    different, unrelated field: the outcomes table's source_email column
    holds a supporting quote from the text (mapped from `supporting_text`
    when writing to Supabase), not an identifier. Keeping the names distinct
    here avoids that mix-up down the line.

    `sent_date` (YYYY-MM-DD) and `case_manager_fallback` are optional,
    known-good values from the email's own metadata (received date, sender)
    - not something the model has to find in the text. Any outcome whose
    date_identified or case_manager comes back blank gets filled in from
    these, deterministically, AFTER verification runs - not before, so the
    verifier is checking what the model actually found in the text, not a
    fallback value it never saw and shouldn't be asked to confirm.

    Returns {"source_id", "outcomes", "verification"}. Never raises for
    "no outcomes found" - that's a normal, valid result.
    """
    outcomes = extract_outcomes(client, email_text, schema, system_prompt)
    for outcome in outcomes:
        outcome["source_id"] = source_id  # filled here, not guessed by the model

    verification = verify_outcomes(client, email_text, outcomes)

    if sent_date or case_manager_fallback:
        for outcome in outcomes:
            if not outcome.get("date_identified") and sent_date:
                outcome["date_identified"] = sent_date
            if not outcome.get("case_manager") and case_manager_fallback:
                outcome["case_manager"] = case_manager_fallback

    return {
        "source_id": source_id,
        "outcomes": outcomes,
        "verification": verification,
    }


def main() -> None:
    api_key = load_api_key()
    client = Anthropic(api_key=api_key)

    classifications, types, taxonomy_reference = load_taxonomy()
    schema = build_schema(classifications, types)
    system_prompt = build_system_prompt(taxonomy_reference)

    if not EMAILS_DIR.exists():
        print(f"ERROR: {EMAILS_DIR} does not exist", file=sys.stderr)
        sys.exit(1)

    email_files = sorted(EMAILS_DIR.glob("*.txt"))
    if not email_files:
        print(f"No .txt files found in {EMAILS_DIR}")
        return

    for path in email_files:
        email_text = path.read_text(encoding="utf-8", errors="replace")
        result = process_email(client, schema, system_prompt, email_text, path.name)

        print(f"\n=== {path.name} ===")
        if not result["outcomes"]:
            print("(no outcomes found)")
        else:
            print(json.dumps(result["outcomes"], indent=2, ensure_ascii=False))

        verification = result["verification"]
        if verification.get("pass") and not verification.get("flags"):
            print("VERIFY: PASS")
        else:
            print("VERIFY: FLAGGED")
            for flag in verification.get("flags", []):
                print(f"  - {flag}")


if __name__ == "__main__":
    main()
