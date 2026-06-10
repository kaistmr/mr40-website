"""저해상 사진을 Real-ESRGAN으로 업스케일해 full/에 넣는다 (라이트박스 자동 반영).

사용법: python3 upscale_photos.py [--limit N] [--min-side PX]
  - 대상: data/gallery.json 항목 중 원본 장변이 --min-side(기본 1000px) 미만인 사진
  - 처리: 원본 → Real-ESRGAN x4 → 장변 1920px 축소 → full/<key>.webp (q82)
  - full/에 이미 있으면 건너뜀 (중단 후 재실행 안전)
  - --limit: 이번 실행에서 처리할 최대 장수 (기본 무제한)

필요: ~/.local/realesrgan/realesrgan-ncnn-vulkan (공식 릴리스 바이너리)
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

WS = Path(__file__).resolve().parents[2]
SITE = Path(__file__).resolve().parents[1]
FULL = SITE / "full"
BIN = Path.home() / ".local" / "realesrgan" / "realesrgan-ncnn-vulkan"
FULL_LONG, FULL_Q = 1920, 82


def main():
    args = sys.argv[1:]
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None
    min_side = int(args[args.index("--min-side") + 1]) if "--min-side" in args else 1000

    if not BIN.exists():
        sys.exit(f"Real-ESRGAN 바이너리가 없습니다: {BIN}")
    items = json.loads((SITE / "data" / "gallery.json").read_text())
    FULL.mkdir(exist_ok=True)

    done = skipped = failed = 0
    for it in items:
        if limit is not None and done >= limit:
            break
        out = FULL / it["thumb"]
        if out.exists():
            skipped += 1
            continue
        src = WS / it["src"]
        try:
            img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        except Exception as e:
            print(f"  ! 열기 실패 {it['src']}: {e}")
            failed += 1
            continue
        if max(img.size) >= min_side:
            continue  # 충분히 큰 원본은 업스케일 불필요
        with tempfile.TemporaryDirectory() as td:
            tin = Path(td) / "in.png"
            tout = Path(td) / "out.png"
            img.save(tin)
            r = subprocess.run(
                [str(BIN), "-i", str(tin), "-o", str(tout), "-n", "realesrgan-x4plus",
                 "-m", str(BIN.parent / "models")],
                capture_output=True)
            if r.returncode != 0 or not tout.exists():
                print(f"  ! ESRGAN 실패 {it['src']}")
                failed += 1
                continue
            up = Image.open(tout).convert("RGB")
            up.thumbnail((FULL_LONG, FULL_LONG))
            up.save(out, "WEBP", quality=FULL_Q)
        done += 1
        if done % 20 == 0:
            print(f"  … {done}장 완료")
    print(f"업스케일 {done}장, 기존 {skipped}장, 실패 {failed}건 → {FULL}")


if __name__ == "__main__":
    main()
