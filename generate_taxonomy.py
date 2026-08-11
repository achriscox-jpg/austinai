"""
generate_taxonomy.py

One-off/occasional local script: reads the real Outcomes.xls (gitignored -
real guest data) and writes taxonomy.json - just the distinct Classification
and Type category names, nothing guest-related. Safe to commit; this is the
same information already hardcoded in script.js's OUTCOME_TAXONOMY, just
generated from the real source instead of copied by hand.

Run this locally whenever the shelter's outcome taxonomy actually changes
(a new Type gets added, etc.) and commit the updated taxonomy.json.
extract_outcomes.load_taxonomy() reads taxonomy.json at runtime, not
Outcomes.xls directly - this is what lets the pipeline run in CI (GitHub
Actions), which never has access to the real spreadsheet.
"""

import json
import sys
from pathlib import Path

import pandas as pd

OUTCOMES_XLS = Path(__file__).parent / "Outcomes.xls"
TAXONOMY_JSON = Path(__file__).parent / "taxonomy.json"


def main() -> None:
    if not OUTCOMES_XLS.exists():
        print(f"ERROR: {OUTCOMES_XLS} does not exist", file=sys.stderr)
        sys.exit(1)

    df = pd.read_excel(OUTCOMES_XLS, engine="xlrd")
    df.columns = [c.strip() for c in df.columns]
    df = df.dropna(subset=["Classification", "Type"])
    df["Classification"] = df["Classification"].astype(str).str.strip()
    df["Type"] = df["Type"].astype(str).str.strip()
    df = df[(df["Classification"] != "") & (df["Type"] != "")]

    classifications = sorted(df["Classification"].unique())
    types = sorted(dict.fromkeys(df["Type"]))

    lines = []
    for classification, group in df.groupby("Classification", sort=True):
        lines.append(f"{classification}:")
        for t in sorted(group["Type"].unique()):
            lines.append(f"  - {t}")
    reference_text = "\n".join(lines)

    TAXONOMY_JSON.write_text(
        json.dumps(
            {
                "classifications": classifications,
                "types": types,
                "reference_text": reference_text,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {TAXONOMY_JSON}: {len(classifications)} classification(s), {len(types)} type(s).")


if __name__ == "__main__":
    main()
