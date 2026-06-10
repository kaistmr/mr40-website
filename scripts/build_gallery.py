"""원본 사진 → 갤러리 썸네일(WebP) + data/gallery.json 생성.
사용법: python3 build_gallery.py <목록파일> [--full-out DIR]
  목록파일: 한 줄에 하나씩, MR_ws 기준 상대경로 (curation.txt)
  --full-out: R2 업로드용 원본급(장변 1920px) WebP도 생성
원본은 절대 수정하지 않는다 (읽기 전용)."""
import json, re, sys, hashlib
from pathlib import Path
from PIL import Image, ImageOps

WS = Path(__file__).resolve().parents[2]      # MR_ws
SITE = Path(__file__).resolve().parents[1]    # 40th_website
THUMB_LONG, FULL_LONG, THUMB_Q, FULL_Q = 480, 1920, 70, 82

def guess_year(path):
    for part in path.parts:
        m = re.search(r"(19[8-9]\d|20[0-2]\d)", part)
        if m: return int(m.group(1))
    return None

def process_image(src, thumb_dir, base, full_dir=None):
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    key = hashlib.md5(str(src.relative_to(base)).encode()).hexdigest()[:12]
    thumb_dir.mkdir(parents=True, exist_ok=True)
    t = img.copy(); t.thumbnail((THUMB_LONG, THUMB_LONG))
    t.save(thumb_dir / f"{key}.webp", "WEBP", quality=THUMB_Q)
    if full_dir:
        full_dir.mkdir(parents=True, exist_ok=True)
        f = img.copy(); f.thumbnail((FULL_LONG, FULL_LONG))
        f.save(full_dir / f"{key}.webp", "WEBP", quality=FULL_Q)
    return {"thumb": f"{key}.webp", "year": guess_year(src.relative_to(base)),
            "src": str(src.relative_to(base))}

def main():
    listfile = Path(sys.argv[1])
    full_out = Path(sys.argv[sys.argv.index("--full-out") + 1]) if "--full-out" in sys.argv else None
    items, errors = [], []
    for line in listfile.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"): continue
        try:
            items.append(process_image(WS / line, SITE / "thumbs", WS, full_out))
        except Exception as e:
            errors.append(f"{line}: {e}")
    items.sort(key=lambda x: (x["year"] or 0, x["src"]))
    (SITE / "data").mkdir(exist_ok=True)
    (SITE / "data" / "gallery.json").write_text(
        json.dumps(items, ensure_ascii=False, indent=1))
    print(f"완료: {len(items)}장, 실패 {len(errors)}건")
    for e in errors: print("  !", e)

if __name__ == "__main__":
    main()
