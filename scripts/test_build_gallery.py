import unittest, tempfile, json
from pathlib import Path
from PIL import Image
from build_gallery import process_image, guess_year

class TestBuildGallery(unittest.TestCase):
    def test_guess_year_from_path(self):
        self.assertEqual(guess_year(Path("cd files/2005 MR/photo.jpg")), 2005)
        self.assertEqual(guess_year(Path("cd files/1998 활동사진/a.jpg")), 1998)
        self.assertIsNone(guess_year(Path("misc/photo.jpg")))

    def test_process_image_creates_thumb_and_meta(self):
        with tempfile.TemporaryDirectory() as td:
            src = Path(td) / "2003 MR" / "img.jpg"; src.parent.mkdir()
            Image.new("RGB", (2000, 1500), "red").save(src, quality=95)
            out = Path(td) / "thumbs"
            meta = process_image(src, out, base=Path(td))
            self.assertTrue((out / meta["thumb"]).exists())
            self.assertEqual(meta["year"], 2003)
            self.assertLess((out / meta["thumb"]).stat().st_size, 80_000)

if __name__ == "__main__":
    unittest.main()
