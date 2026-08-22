from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
INIT_DIR = ROOT / "init"
OUTPUT_PATH = ROOT / "data" / "awards.json"
LOGO_OUTPUT_PATH = ROOT / "assets" / "logo.svg"

MAIN_NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
OFFICE_REL_ID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
CELL_REFERENCE = re.compile(r"([A-Z]+)(\d+)")
MEDAL = re.compile(r"(🥇|🥈|🥉)\s*(\d+)?")

MEDAL_NAMES = {"🥇": "金", "🥈": "银", "🥉": "铜"}
JSON_MEDAL_NAMES = {"金奖": "金", "银奖": "银", "铜奖": "铜"}
EXPECTED_EXCEL_COUNTS = {
    "2021": Counter({"金": 5, "银": 11, "铜": 12}),
    "2022": Counter({"金": 4, "银": 15, "铜": 10}),
    "2023": Counter({"金": 7, "银": 14, "铜": 10}),
    "2024": Counter({"金": 3, "银": 10, "铜": 12}),
    "2025": Counter({"金": 7, "银": 20, "铜": 10}),
}

SHEET_LAYOUTS = {
    "2021": {"team": 2, "members": range(3, 6), "contests": range(6, 17)},
    "2022": {"team": 4, "members": range(5, 8), "contests": range(8, 21)},
    "2023": {"team": 2, "members": range(3, 6), "contests": range(6, 20)},
    "2024": {"team": 2, "members": range(3, 6), "contests": range(6, 20)},
    "2025": {"team": 2, "members": range(3, 6), "contests": range(6, 19)},
}


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def column_number(reference: str) -> int:
    match = CELL_REFERENCE.fullmatch(reference)
    if not match:
        raise ValueError(f"Invalid cell reference: {reference}")

    number = 0
    for character in match.group(1):
        number = number * 26 + ord(character) - ord("A") + 1
    return number


def read_xlsx(path: Path) -> dict[str, dict[int, dict[int, str]]]:
    with ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", MAIN_NS):
                shared_strings.append(
                    "".join(node.text or "" for node in item.iterfind(".//m:t", MAIN_NS))
                )

        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        relationships = ElementTree.fromstring(
            archive.read("xl/_rels/workbook.xml.rels")
        )
        targets = {
            relation.attrib["Id"]: relation.attrib["Target"]
            for relation in relationships.findall("r:Relationship", REL_NS)
        }

        sheets: dict[str, dict[int, dict[int, str]]] = {}
        for sheet in workbook.findall("m:sheets/m:sheet", MAIN_NS):
            name = sheet.attrib["name"]
            target = targets[sheet.attrib[OFFICE_REL_ID]].lstrip("/")
            sheet_path = (
                target
                if target.startswith("xl/")
                else str(PurePosixPath("xl") / target)
            )
            root = ElementTree.fromstring(archive.read(sheet_path))
            rows: dict[int, dict[int, str]] = {}

            for row in root.findall("m:sheetData/m:row", MAIN_NS):
                row_number = int(row.attrib["r"])
                values: dict[int, str] = {}
                for cell in row.findall("m:c", MAIN_NS):
                    kind = cell.attrib.get("t")
                    value_node = cell.find("m:v", MAIN_NS)
                    if kind == "inlineStr":
                        value = "".join(
                            node.text or ""
                            for node in cell.iterfind(".//m:t", MAIN_NS)
                        )
                    elif value_node is None:
                        value = ""
                    elif kind == "s":
                        value = shared_strings[int(value_node.text or 0)]
                    elif kind == "b":
                        value = "TRUE" if value_node.text == "1" else "FALSE"
                    else:
                        value = value_node.text or ""
                    values[column_number(cell.attrib["r"])] = clean_text(value)
                rows[row_number] = values
            sheets[name] = rows

    return sheets


def normalize_contest(name: str) -> str:
    name = clean_text(name)
    name = re.sub(r"^ICPC\s*EC[\s-]*Final", "ICPC EC Final", name, flags=re.I)
    name = re.sub(r"^EC[\s-]*Final", "ICPC EC Final", name, flags=re.I)
    name = re.sub(r"^CCPC[\s-]*Final", "CCPC Final", name, flags=re.I)
    name = re.sub(r"^CCPC\s*女生赛", "CCPC 女生专场", name, flags=re.I)
    name = re.sub(r"^ICPC(?=\S)", "ICPC ", name)
    name = re.sub(r"^CCPC(?=\S)", "CCPC ", name)
    return clean_text(name)


def excel_contests(
    sheet_name: str, rows: dict[int, dict[int, str]], columns: range
) -> dict[int, str]:
    if sheet_name != "2025":
        return {
            column: normalize_contest(rows.get(2, {}).get(column, ""))
            for column in columns
        }

    group = ""
    contests: dict[int, str] = {}
    for column in columns:
        group = rows.get(1, {}).get(column, "") or group
        venue = rows.get(2, {}).get(column, "")
        prefix = {
            "ICPC 区域赛": "ICPC",
            "ECF": "ICPC EC Final",
            "CCPC 分站赛": "CCPC",
            "女生赛": "CCPC 女生专场",
            "CCF": "CCPC Final",
        }.get(group, group)
        contests[column] = normalize_contest(f"{prefix} {venue}")
    return contests


def split_members(values: list[str]) -> list[str]:
    members: list[str] = []
    for value in values:
        for member in re.split(r"[、/]", clean_text(value)):
            member = clean_text(member)
            if member and member not in members:
                members.append(member)
    return members


def make_record(
    season: str,
    contest: str,
    team: str,
    members: list[str],
    award: str,
    rank: int | None,
) -> dict[str, object]:
    return {
        "season": season,
        "contest": normalize_contest(contest),
        "team": clean_text(team),
        "members": members,
        "award": award,
        "rank": rank,
    }


def excel_records(sheets: dict[str, dict[int, dict[int, str]]]) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []

    for sheet_name in ("2025", "2024", "2023", "2022", "2021"):
        rows = sheets[sheet_name]
        layout = SHEET_LAYOUTS[sheet_name]
        contests = excel_contests(sheet_name, rows, layout["contests"])
        season = f"{sheet_name}-{int(sheet_name) + 1}"
        sheet_records: list[dict[str, object]] = []

        for column in layout["contests"]:
            contest = contests[column]
            if not contest:
                continue
            for row_number in sorted(rows):
                if row_number < 4:
                    continue
                row = rows[row_number]
                match = MEDAL.fullmatch(row.get(column, ""))
                if not match:
                    continue
                team = row.get(layout["team"], "")
                members = split_members(
                    [row.get(member_column, "") for member_column in layout["members"]]
                )
                if not team or not members:
                    raise ValueError(
                        f"Missing team or members in sheet {sheet_name}, row {row_number}"
                    )
                sheet_records.append(
                    make_record(
                        season,
                        contest,
                        team,
                        members,
                        MEDAL_NAMES[match.group(1)],
                        int(match.group(2)) if match.group(2) else None,
                    )
                )

        counts = Counter(record["award"] for record in sheet_records)
        if counts != EXPECTED_EXCEL_COUNTS[sheet_name]:
            raise ValueError(
                f"Unexpected medal counts in sheet {sheet_name}: {dict(counts)}"
            )
        records.extend(sheet_records)

    return records


def historic_json_records(path: Path) -> list[dict[str, object]]:
    source = json.loads(path.read_text(encoding="utf-8"))
    records: list[dict[str, object]] = []

    for season_data in source:
        match = re.search(r"(\d{4})-(\d{4})", season_data["season"])
        if not match or int(match.group(1)) >= 2021:
            continue
        season = f"{match.group(1)}-{match.group(2)}"
        for contest_data in season_data["contests"]:
            for team_data in contest_data["teams"]:
                award = JSON_MEDAL_NAMES.get(team_data["prize"])
                if not award:
                    continue
                records.append(
                    make_record(
                        season,
                        contest_data["contest"],
                        team_data["team"],
                        split_members([team_data["members"]]),
                        award,
                        None,
                    )
                )

    return records


def main() -> None:
    workbook_paths = list(INIT_DIR.glob("*.xlsx"))
    if len(workbook_paths) != 1:
        raise FileNotFoundError("Expected exactly one .xlsx workbook in init/")

    records = excel_records(read_xlsx(workbook_paths[0]))
    records.extend(historic_json_records(INIT_DIR / "awards.json"))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    LOGO_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOGO_OUTPUT_PATH.write_bytes((INIT_DIR / "社团logo.svg").read_bytes())

    counts = Counter(record["award"] for record in records)
    seasons = {record["season"] for record in records}
    print(
        f"Wrote {len(records)} records across {len(seasons)} seasons "
        f"({counts['金']} gold, {counts['银']} silver, {counts['铜']} bronze)."
    )


if __name__ == "__main__":
    main()
