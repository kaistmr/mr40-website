"""archive/ 옛 홈페이지를 GitHub Pages(대소문자 구분)에서 깨지지 않게 손본다.

1. 링크 대소문자 맞추기: HTML의 `0010.jpg`가 실제로는 `0010.JPG`면 링크 쪽을 고친다.
   (macOS는 대소문자를 무시해서 로컬에선 멀쩡해 보이지만 라이브에선 404)
2. 개인정보 가리기: 공개 페이지의 이메일·휴대폰 번호를 [비공개]로.

사용법: python3 scripts/fix_archive_live.py [--dry]
여러 번 돌려도 결과가 같다(이미 맞는 링크는 건드리지 않음).
"""
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ARCHIVE = Path(__file__).resolve().parents[1] / "archive"
LINK = re.compile(
    rb"""(["'(=])([^"'()<>\s=]+?\.(?:jpe?g|gif|png|bmp|html?|swf|mid|mp3|wav|css|js|pdf))([?#][^"')]*)?(?=["')\s>])""",
    re.I)
EMAIL = re.compile(rb"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")
PHONE = re.compile(rb"01[016789][-. )]?\d{3,4}[-. ]?\d{4}")
_listing = {}


def entries(d):
    if d not in _listing:
        try:
            _listing[d] = os.listdir(d)
        except OSError:
            _listing[d] = []
    return _listing[d]


def fix_case(base, link):
    """link(상대경로)를 실제 파일 대소문자에 맞춘 문자열로. 고칠 게 없거나 못 찾으면 None."""
    if re.match(r"^[a-z]+:|^/|%", link, re.I):
        return None
    cur, out, changed = base, [], False
    for part in link.split("/"):
        if part in ("", ".", ".."):
            cur = os.path.normpath(os.path.join(cur, part)) if part else cur
            out.append(part)
            continue
        names = entries(cur)
        if part in names:
            real = part
        else:
            hits = [n for n in names if n.lower() == part.lower()]
            if len(hits) != 1:
                return None
            real, changed = hits[0], True
        out.append(real)
        cur = os.path.join(cur, real)
    return "/".join(out) if changed else None


def process(path, dry):
    raw = path.read_bytes()
    base = str(path.parent)
    n_case = 0

    def repl(m):
        nonlocal n_case
        try:
            link = m.group(2).decode("ascii")
        except UnicodeDecodeError:
            return m.group(0)
        fixed = fix_case(base, unquote(link) if "%" not in link else link)
        if not fixed:
            return m.group(0)
        n_case += 1
        return m.group(1) + fixed.encode() + (m.group(3) or b"")

    new = LINK.sub(repl, raw)
    new, n_mail = EMAIL.subn(b"[\xeb\xb9\x84\xea\xb3\xb5\xea\xb0\x9c]", new)  # "[비공개]" (UTF-8)
    new, n_tel = PHONE.subn(b"[\xeb\xb9\x84\xea\xb3\xb5\xea\xb0\x9c]", new)
    if new != raw and not dry:
        path.write_bytes(new)
    return n_case, n_mail, n_tel


def main():
    dry = "--dry" in sys.argv
    total = [0, 0, 0]
    for p in sorted(ARCHIVE.rglob("*")):
        if p.suffix.lower() in (".htm", ".html") and not p.name.startswith("._"):
            r = process(p, dry)
            if any(r):
                print(f"{p.relative_to(ARCHIVE)}: 대소문자 {r[0]} · 이메일 {r[1]} · 전화 {r[2]}")
            total = [a + b for a, b in zip(total, r)]
    print(f"{'(dry) ' if dry else ''}합계: 대소문자 {total[0]} · 이메일 {total[1]} · 전화 {total[2]}")


if __name__ == "__main__":
    main()
