"""archive/ HTML의 한글(EUC-KR 바이트) 링크를 UTF-8 퍼센트 인코딩으로 재작성.

옛 홈페이지(특히 PPT/Word 내보내기)는 src/href에 EUC-KR 바이트의 한글 파일명을
그대로(혹은 %인코딩 섞어서) 쓴다. GitHub Pages의 파일명은 UTF-8이라 그대로는
404가 난다. 비ASCII 로컬 링크를 cp949로 해석해 NFC 정규화 후 UTF-8 %인코딩으로
바꾼다. 따옴표로 감싼 링크(공백 포함)와 기존 %이스케이프도 올바르게 처리한다.

사용법: python3 fix_archive_links.py   (build_archive.py 실행 후에 돌릴 것)
"""
import re
import unicodedata
from pathlib import Path
from urllib.parse import quote, unquote_to_bytes

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE / "archive"

# 따옴표 유무 모두 처리: ="...", ='...', =값
ATTR = re.compile(
    rb'''((?:src|href|background)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^"'\s>]+))''',
    re.I,
)
SCHEMES = (b"http:", b"https:", b"mailto:", b"javascript:", b"ftp:", b"file:", b"#", b"data:")


def fix_value(raw: bytes) -> bytes:
    if raw.lower().lstrip().startswith(SCHEMES):
        return raw
    # %이스케이프를 바이트로 환원한 뒤 비ASCII 여부 판단
    try:
        decoded = unquote_to_bytes(raw)
    except Exception:
        decoded = raw
    if all(b < 0x80 for b in decoded):
        return raw  # 순수 ASCII 링크는 손대지 않는다
    try:
        text = decoded.decode("cp949")
    except UnicodeDecodeError:
        try:
            text = decoded.decode("utf-8")
        except UnicodeDecodeError:
            return raw
    text = unicodedata.normalize("NFC", text).replace("\\", "/")
    return quote(text, safe="/#?&=.~-_!*'()").encode("ascii")


def main():
    pages = fixed = 0
    for html in ROOT.rglob("*.htm*"):
        data = html.read_bytes()
        changed = [0]

        def repl(m):
            val = m.group(2) if m.group(2) is not None else (
                m.group(3) if m.group(3) is not None else m.group(4))
            new = fix_value(val)
            if new != val:
                changed[0] += 1
            return m.group(1) + b'"' + new + b'"'

        new_data = ATTR.sub(repl, data)
        pages += 1
        if changed[0]:
            html.write_bytes(new_data)
            fixed += changed[0]
    print(f"검사 {pages}페이지, 링크 재작성 {fixed}건")


if __name__ == "__main__":
    main()
