"""옛 연도별 홈페이지 덤프(cd files)를 사이트 archive/로 보존 복사.

사용법: python3 build_archive.py

- 원본(cd files)은 읽기만 한다. 사본은 40th_website/archive/<연도>/에 생성.
- 웹 자산만 복사 (html/css/js/이미지/플래시/아이콘/소리). 영상·압축파일 제외.
- 대형 JPEG(>500KB)는 장변 1600px·q80으로 줄여 저장 (파일명 유지 → 링크 안 깨짐).
- charset 미선언 HTML은 인코딩을 추정(utf-8 시도 → 실패 시 euc-kr)해 meta 주입.
- 끝나면 각 연도의 진입 페이지를 출력한다 (archive.html 링크용).
"""
import re
import shutil
from pathlib import Path

from PIL import Image, ImageOps

WS = Path(__file__).resolve().parents[2]
SITE = Path(__file__).resolve().parents[1]
SRC_ROOT = WS / "cd files"
OUT_ROOT = SITE / "archive"

# 연도 → 원본 폴더 ("2005-MR story in KAIST"는 2005 MR과 중복이라 제외)
DUMPS = {
    "2001": "2001 MR",
    "2002": "2002 MR",
    "2005": "2005 MR",
    "2007": "2007 MR",
    "2008": "2008 MR",
    "2009": "2009 MR",
}

WEB_EXTS = {".htm", ".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".gif",
            ".bmp", ".swf", ".ico", ".mid", ".wav", ".cur",
            # 오피스 HTML 내보내기 보조 파일 (PPT/Word 페이지 렌더링에 필요)
            ".xml", ".mso", ".wmf", ".thmx", ".emz", ".xls"}
BIG_JPEG = 200 * 1024
MAX_LONG = 1280
SOUND_MAX = 5 * 1024 * 1024

CHARSET_RE = re.compile(rb"charset\s*=", re.I)
HEAD_RE = re.compile(rb"(<head[^>]*>)", re.I)


def fix_html(data: bytes) -> bytes:
    """charset 미선언 HTML에 인코딩 meta 주입."""
    if CHARSET_RE.search(data):
        return data
    try:
        data.decode("utf-8")
        cs = b"utf-8"
    except UnicodeDecodeError:
        cs = b"euc-kr"
    meta = b'<meta http-equiv="Content-Type" content="text/html; charset=' + cs + b'">'
    if HEAD_RE.search(data):
        return HEAD_RE.sub(lambda m: m.group(1) + meta, data, count=1)
    return meta + data


def copy_asset(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    if ext in (".htm", ".html"):
        dst.write_bytes(fix_html(src.read_bytes()))
    elif ext in (".jpg", ".jpeg") and src.stat().st_size > BIG_JPEG:
        img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        img.thumbnail((MAX_LONG, MAX_LONG))
        img.save(dst, "JPEG", quality=78)
    elif ext in (".mid", ".wav") and src.stat().st_size > SOUND_MAX:
        return  # 대형 사운드는 생략
    else:
        shutil.copy2(src, dst)


def main():
    for year, folder in DUMPS.items():
        src_dir = SRC_ROOT / folder
        out_dir = OUT_ROOT / year
        n = 0
        for src in src_dir.rglob("*"):
            if not src.is_file() or src.name.startswith("._"):
                continue
            if src.suffix.lower() not in WEB_EXTS:
                continue
            copy_asset(src, out_dir / src.relative_to(src_dir))
            n += 1
        # 진입 페이지 탐색
        entry = None
        for cand in ["index.html", "index.htm", "main.html", "main.htm", "2009MR.htm"]:
            hits = sorted(out_dir.rglob(cand), key=lambda p: len(p.parts))
            if hits:
                entry = hits[0].relative_to(OUT_ROOT)
                break
        size_mb = sum(f.stat().st_size for f in out_dir.rglob("*") if f.is_file()) / 1048576
        print(f"{year}: {n}개 파일, {size_mb:.0f}MB, entry={entry}")


if __name__ == "__main__":
    main()
