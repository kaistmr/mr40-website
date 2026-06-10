"""기존 홈페이지 SQL 덤프에서 history 테이블을 timeline.json 초안으로 추출.
사용법: python3 extract_timeline.py  (원본 SQL은 읽기만 한다)"""
import json
import re
from pathlib import Path

WS = Path(__file__).resolve().parents[2]
SQL = WS / "Website_Server_Backup" / "mr_homepage_dump.sql"
OUT = Path(__file__).resolve().parents[1] / "data" / "timeline.json"


def parse_rows(sql_text):
    m = re.search(r"INSERT INTO `history` VALUES (.+?);\n", sql_text, re.S)
    if not m:
        return []
    rows = re.findall(r"\((\d+),'((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\)", m.group(1))
    unesc = lambda s: s.replace("\\'", "'").replace('\\"', '"').replace("\\n", "\n")
    items = []
    for _, d, t in rows:
        date = unesc(d).strip()
        ym = re.match(r"(\d{4})", date)
        items.append({
            "year": int(ym.group(1)) if ym else None,
            "date": date,
            "text": unesc(t).strip(),
        })
    return items


if __name__ == "__main__":
    items = parse_rows(SQL.read_text(encoding="utf-8", errors="replace"))
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=1))
    print(f"{len(items)}건 → {OUT}")
