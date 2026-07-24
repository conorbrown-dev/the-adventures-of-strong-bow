#!/usr/bin/env python3
"""Rebuild the vendored Common Core K-5 JSON and CSV from the pinned recovery CSV.

This script intentionally performs no network access. The source snapshot is kept
under resources/raw so repository builds remain reproducible even when external
sites change or disappear.
"""

from pathlib import Path
import csv
import hashlib
import json
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "resources/raw/ccss-recovery-source-philngo-rev-02895145.csv"
OUT_DIR = ROOT / "data/curriculum/generated"
OUT_JSON = OUT_DIR / "common-core-k5-standards.json"
OUT_CSV = OUT_DIR / "common-core-k5-standards.csv"
OUT_MANIFEST = OUT_DIR / "common-core-k5-manifest.json"

NOTICE = (
    "© Copyright 2010. National Governors Association Center for Best Practices "
    "and Council of Chief State School Officers. All rights reserved."
)
RECOVERY_URL = (
    "https://gist.github.com/philngo/2735248c98c3e0cd7814/raw/"
    "02895145c97bee04998d8860781b4de97081fd4e/ccss.csv"
)
OFFICIAL_ELA_PDF = "https://corestandards.org/wp-content/uploads/2023/09/ELA_Standards1.pdf"
OFFICIAL_MATH_PDF = "https://corestandards.org/wp-content/uploads/2023/09/Math_Standards1.pdf"


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def short_code(row: dict[str, str]) -> str:
    source_id = row["id"]
    if source_id.startswith("CCSS.ELA-LITERACY."):
        parts = source_id.removeprefix("CCSS.ELA-LITERACY.").split(".")
        if len(parts) < 3:
            raise ValueError(f"Unexpected ELA identifier: {source_id}")
        return ".".join([parts[1], parts[0], *parts[2:]])
    if source_id.startswith("CCSS.MATH.CONTENT."):
        return source_id.removeprefix("CCSS.MATH.CONTENT.")
    raise ValueError(f"Unexpected Common Core identifier: {source_id}")


def main() -> None:
    if not RAW.exists():
        raise FileNotFoundError(f"Missing pinned recovery source: {RAW}")

    with RAW.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        required = {
            "id", "content_type", "category_id", "category_name",
            "grade_id", "grade_name", "item", "description"
        }
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Missing required CSV headers: {sorted(missing)}")
        source_rows = list(reader)

    grades = {"K", "1", "2", "3", "4", "5"}
    rows = [row for row in source_rows if row["grade_id"] in grades]
    codes = {short_code(row) for row in rows}

    def leaf(code: str) -> bool:
        return not any(other.startswith(code + ".") for other in codes)

    records = []
    for row in rows:
        subject = "ela" if row["content_type"] == "ELA-LITERACY" else "math"
        code = short_code(row)
        is_leaf = leaf(code)
        statement_lower = row["description"].strip().lower()

        if statement_lower.startswith("(begins in grade") or statement_lower.startswith("(not applicable"):
            status = "notApplicableAtGrade"
        elif not is_leaf:
            status = "broadStandard"
        else:
            status = "assessable"

        parts = code.split(".")
        cluster_code = ".".join(parts[:3]) if subject == "math" and len(parts) >= 3 else None
        parent_id = None
        if subject == "ela" and len(parts) >= 4:
            candidate = ".".join(parts[:-1])
            if candidate in codes:
                parent_id = candidate

        records.append({
            "schemaVersion": 1,
            "officialId": code,
            "canonicalId": row["id"],
            "subject": subject,
            "grade": row["grade_id"],
            "gradeName": row["grade_name"],
            "domainCode": row["category_id"],
            "domain": row["category_name"],
            "strand": row["category_name"] if subject == "ela" else None,
            "clusterCode": cluster_code,
            "parentId": parent_id,
            "sourceItem": row["item"],
            "statement": row["description"],
            "childFriendlyDescription": None,
            "isLeaf": is_leaf,
            "instructionalStatus": status,
            "prerequisiteIds": [],
            "tags": [row["category_id"].lower(), subject],
            "source": {
                "publisher": "NGA Center/CCSSO",
                "package": "Common Core State Standards",
                "reference": RAW.name,
                "recoverySourceUrl": RECOVERY_URL,
                "recoveryRevision": "02895145c97bee04998d8860781b4de97081fd4e",
                "officialReferencePdf": OFFICIAL_ELA_PDF if subject == "ela" else OFFICIAL_MATH_PDF,
                "verification": "Representative entries verified against official PDFs; full row-by-row audit pending."
            },
            "license": {
                "name": "Common Core Public License",
                "notice": NOTICE
            },
            "active": status != "notApplicableAtGrade"
        })

    records.sort(
        key=lambda item: (
            ["K", "1", "2", "3", "4", "5"].index(item["grade"]),
            item["subject"],
            item["domainCode"],
            item["officialId"]
        )
    )

    if len(records) != 695:
        raise ValueError(f"Expected 695 K-5 records; got {len(records)}")
    if len({record["officialId"] for record in records}) != len(records):
        raise ValueError("Duplicate officialId values found")
    if len({record["canonicalId"] for record in records}) != len(records):
        raise ValueError("Duplicate canonicalId values found")

    lookup = {record["officialId"]: record["statement"] for record in records}
    expected = {
        "K.CC.A.1": "Count to 100 by ones and by tens.",
        "K.RF.1.d": "Recognize and name all upper- and lowercase letters of the alphabet.",
        "K.RF.2.a": "Recognize and produce rhyming words."
    }
    for code, statement in expected.items():
        if lookup.get(code) != statement:
            raise ValueError(f"Known verification sample failed: {code}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps({
            "schemaVersion": 1,
            "title": "Common Core K-5 Mathematics and ELA Standards",
            "copyrightNotice": NOTICE,
            "sourceStatus": (
                "Vendored recovery dataset because the official machine-readable "
                "downloads were unavailable on 2026-07-24."
            ),
            "recordCount": len(records),
            "records": records
        }, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )

    fields = [
        "officialId", "canonicalId", "subject", "grade", "gradeName",
        "domainCode", "domain", "strand", "clusterCode", "parentId",
        "sourceItem", "statement", "isLeaf", "instructionalStatus", "active"
    ]
    with OUT_CSV.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow({field: record.get(field) for field in fields})

    counts = Counter((record["subject"], record["grade"]) for record in records)
    manifest = {
        "schemaVersion": 1,
        "recordCount": len(records),
        "leafRecordCount": sum(record["isLeaf"] for record in records),
        "assessableRecordCount": sum(
            record["instructionalStatus"] == "assessable" for record in records
        ),
        "notApplicableAtGradeCount": sum(
            record["instructionalStatus"] == "notApplicableAtGrade" for record in records
        ),
        "countsBySubjectAndGrade": {
            f"{subject}:{grade}": count
            for (subject, grade), count in sorted(counts.items())
        },
        "files": {
            RAW.name: {"sha256": checksum(RAW), "bytes": RAW.stat().st_size},
            OUT_JSON.name: {"sha256": checksum(OUT_JSON), "bytes": OUT_JSON.stat().st_size},
            OUT_CSV.name: {"sha256": checksum(OUT_CSV), "bytes": OUT_CSV.stat().st_size}
        }
    }
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Built {len(records)} standards.")
    print(f"JSON: {OUT_JSON}")
    print(f"CSV:  {OUT_CSV}")


if __name__ == "__main__":
    main()
