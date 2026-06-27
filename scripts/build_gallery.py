"""photos/ 폴더의 사진 → 갤러리 썸네일(WebP) + data/gallery.json 생성.

사용법: python3 build_gallery.py [목록파일] [--full-out DIR]
  - 기본(인자 없음): MR_ws/photos/<연도>/ 전체 스캔
    (연도 폴더명에서 연도 자동 인식, '연도미상' 폴더는 미상 처리)
  - 사진 추가: photos/<연도>/에 파일을 넣고 이 스크립트를 다시 실행
  - 목록파일: 구버전 방식 — MR_ws 기준 상대경로를 한 줄에 하나씩 적은 파일
  - --full-out DIR: 원본급(장변 1920px) WebP도 생성 (R2 업로드·업스케일 원본용)
  - 업스케일 자동 반영: 업스케일한 WebP를 사이트 full/ 폴더에 같은 파일명으로
    넣으면 라이트박스가 자동으로 그 파일을 먼저 사용한다 (코드 수정 불필요)

원본은 절대 수정하지 않는다 (읽기 전용).
"""
import json
import re
import sys
import hashlib
from pathlib import Path

from PIL import Image, ImageOps

WS = Path(__file__).resolve().parents[2]      # MR_ws
SITE = Path(__file__).resolve().parents[1]    # 40th_website
PHOTOS = WS / "photos"
THUMB_LONG, FULL_LONG, THUMB_Q, FULL_Q = 480, 1920, 70, 82
IMG_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}


YEAR = r"(?:19[8-9]\d|20[0-2]\d)"


def guess_year(path):
    # 범위 폴더(예: '2007-2013', '2014~2017')는 범위 라벨 문자열로 반환
    for part in path.parts:
        m = re.search(rf"({YEAR})\s*[-~–]\s*({YEAR})", part)
        if m:
            return f"{m.group(1)}–{m.group(2)}"   # 2007–2013 (en dash)
    for part in path.parts:
        m = re.search(rf"({YEAR})", part)
        if m:
            return int(m.group(0))
    return None


def year_key(year):
    """정렬용 숫자 키 — 연도미상은 -1, 범위는 시작 연도."""
    if year is None:
        return -1
    m = re.match(r"\d{4}", str(year))
    return int(m.group(0)) if m else 0


def year_slug(year):
    """URL/파일명 안전한 키 — 범위의 en dash·물결을 하이픈으로."""
    if year is None or year == "unknown":
        return "unknown"
    return re.sub(r"[–~]", "-", str(year))


def process_image(src, thumb_dir, base, full_dir=None):
    key = hashlib.md5(str(src.relative_to(base)).encode()).hexdigest()[:12]
    thumb_path = thumb_dir / f"{key}.webp"
    full_path = (full_dir / f"{key}.webp") if full_dir else None
    need_thumb = not thumb_path.exists()
    need_full = bool(full_path) and not full_path.exists()
    # 이미 만들어진 썸네일은 재인코딩하지 않음 (사진 추가 시 증분 실행)
    if need_thumb or need_full:
        img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        if need_thumb:
            thumb_dir.mkdir(parents=True, exist_ok=True)
            t = img.copy()
            t.thumbnail((THUMB_LONG, THUMB_LONG))
            t.save(thumb_path, "WEBP", quality=THUMB_Q)
        if need_full:
            full_dir.mkdir(parents=True, exist_ok=True)
            f = img.copy()
            f.thumbnail((FULL_LONG, FULL_LONG))
            f.save(full_path, "WEBP", quality=FULL_Q)
    return {"thumb": f"{key}.webp", "year": guess_year(src.relative_to(base)),
            "src": str(src.relative_to(base))}


def collect_sources(listfile):
    """기본은 photos/ 디렉토리 스캔, 목록 파일이 주어지면 그 목록."""
    if listfile:
        srcs = []
        for line in Path(listfile).read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                srcs.append(WS / line)
        return srcs
    return sorted(
        p for p in PHOTOS.rglob("*")
        if p.is_file() and p.suffix.lower() in IMG_EXTS and not p.name.startswith("._")
    )


def write_gallery_data(items, data_dir):
    data_dir.mkdir(exist_ok=True)
    (data_dir / "gallery.json").write_text(
        json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")

    years_dir = data_dir / "gallery-years"
    years_dir.mkdir(exist_ok=True)
    groups = {}
    for item in items:
        key = "unknown" if item["year"] is None else str(item["year"])
        groups.setdefault(key, []).append(item)

    index = []
    for key, group in sorted(
            groups.items(),
            key=lambda pair: year_key(None if pair[0] == "unknown" else pair[0])):
        if key == "unknown":
            year_val = None
        elif key.isdigit():
            year_val = int(key)
        else:
            year_val = key                       # 범위 라벨(예: 2007–2013)
        filename = f"{year_slug(key)}.json"
        (years_dir / filename).write_text(
            json.dumps(group, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8")
        index.append({
            "year": year_val,
            "count": len(group),
            "file": f"data/gallery-years/{filename}",
        })
    (years_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8")


def main():
    args = sys.argv[1:]
    full_out = None
    if "--full-out" in args:
        i = args.index("--full-out")
        full_out = Path(args[i + 1])
        del args[i:i + 2]
    listfile = args[0] if args else None

    items, errors = [], []
    for src in collect_sources(listfile):
        try:
            items.append(process_image(src, SITE / "thumbs", WS, full_out))
        except Exception as e:
            errors.append(f"{src}: {e}")
    items.sort(key=lambda x: (year_key(x["year"]), str(x["src"])))
    write_gallery_data(items, SITE / "data")
    print(f"완료: {len(items)}장, 실패 {len(errors)}건")
    for e in errors:
        print("  !", e)


if __name__ == "__main__":
    main()
