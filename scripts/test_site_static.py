import re
import csv
import json
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PAGES = [
    "index.html",
    "timeline.html",
    "members.html",
    "gallery.html",
    "magazine.html",
    "archive.html",
    "event.html",
    "survey.html",
    "stats.html",
    "day.html",
]


class TestSiteStatic(unittest.TestCase):
    def test_public_pages_have_share_metadata_and_icons(self):
        for name in PUBLIC_PAGES:
            html = (ROOT / name).read_text(encoding="utf-8")
            with self.subTest(page=name):
                self.assertIn('name="description"', html)
                self.assertIn('property="og:title"', html)
                self.assertIn('property="og:description"', html)
                self.assertIn('property="og:image"', html)
                self.assertIn('rel="apple-touch-icon"', html)

    def test_social_and_icon_asset_dimensions(self):
        expected = {
            "assets/og-image.png": (1200, 630),
            "assets/apple-touch-icon.png": (180, 180),
            "assets/favicon.png": (64, 64),
        }
        for path, size in expected.items():
            with self.subTest(asset=path):
                with Image.open(ROOT / path) as image:
                    self.assertEqual(image.size, size)

    def test_gallery_uses_batched_rendering_and_dialog_semantics(self):
        html = (ROOT / "gallery.html").read_text(encoding="utf-8")
        self.assertRegex(html, r"var batchSize\s*=\s*200")
        self.assertIn("IntersectionObserver", html)
        self.assertIn('role="dialog"', html)
        self.assertIn("history.pushState", html)
        self.assertIn('aria-modal="true"', html)
        self.assertIn('fetchpriority="high"', html)

    def test_member_code_uses_numeric_keyboard(self):
        html = (ROOT / "members.html").read_text(encoding="utf-8")
        code_input = re.search(r'<input[^>]+id="code-input"[^>]*>', html, re.S)
        self.assertIsNotNone(code_input)
        self.assertIn('inputmode="numeric"', code_input.group(0))

    def test_new_pages_exist(self):
        for name in ["404.html", "survey.html", "stats.html", "day.html"]:
            with self.subTest(page=name):
                self.assertTrue((ROOT / name).is_file())

    def test_accessibility_font_overrides_cover_small_information_text(self):
        css = (ROOT / "assets" / "style.css").read_text(encoding="utf-8")
        selectors = [
            ".dday-caption",
            ".wm-later",
            ".ev-dday .label",
            ".program-row .time",
            ".cohort-badge",
            ".book-cover .cover-placeholder small",
            ".ar-body p",
            ".page-utilities button",
            ".music-fab",
            ".new-window-note",
        ]
        override = re.search(
            r"/\* 시니어 접근성.*?\*/(?P<selectors>.*?)\{"
            r"\s*font-size:\s*0\.875rem\s*!important;",
            css,
            re.S,
        )
        self.assertIsNotNone(override)
        for selector in selectors:
            with self.subTest(selector=selector):
                self.assertIn(selector, override.group("selectors"))

    def test_404_has_icons(self):
        html = (ROOT / "404.html").read_text(encoding="utf-8")
        self.assertIn('rel="icon"', html)
        self.assertIn('rel="apple-touch-icon"', html)

    def test_pages_do_not_load_unused_tailwind_runtime(self):
        for name in PUBLIC_PAGES:
            html = (ROOT / name).read_text(encoding="utf-8")
            with self.subTest(page=name):
                self.assertNotIn("cdn.tailwindcss.com", html)

    def test_gallery_year_data_matches_full_gallery(self):
        full_gallery = json.loads(
            (ROOT / "data" / "gallery.json").read_text(encoding="utf-8"))
        year_dir = ROOT / "data" / "gallery-years"
        index = json.loads(
            (year_dir / "index.json").read_text(encoding="utf-8"))
        self.assertEqual(sum(entry["count"] for entry in index), len(full_gallery))
        for entry in index:
            filename = Path(entry["file"]).name
            with self.subTest(filename=filename):
                items = json.loads(
                    (year_dir / filename).read_text(encoding="utf-8"))
                self.assertEqual(len(items), entry["count"])

    def test_operations_sheet_templates_keep_expected_headers(self):
        expected = {
            "공지.csv": ["active", "title", "body", "link", "label", "starts_at", "ends_at"],
            "행사정보.csv": ["key", "value"],
            "후원사.csv": ["name", "logo", "url", "sort", "active"],
            "영상목록.csv": ["id", "title", "year", "desc", "active"],
            "설문링크.csv": ["id", "icon", "title", "desc", "url", "active", "prefill_generation_key"],
            "통계.csv": ["group", "label", "value", "sort", "public"],
        }
        template_dir = ROOT / "docs" / "operations-sheet-templates"
        for filename, headers in expected.items():
            with self.subTest(template=filename):
                with (template_dir / filename).open(encoding="utf-8", newline="") as handle:
                    self.assertEqual(next(csv.reader(handle)), headers)


if __name__ == "__main__":
    unittest.main()
