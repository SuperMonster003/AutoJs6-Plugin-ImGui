import importlib.util
import json
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location("release_notes_under_test", Path(__file__).with_name("release_notes.py"))
release_notes = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release_notes)

CHANGELOG = {
    "changelog_label_hint": "Hint",
    "changelog_label_feature": "Feature",
    "changelog_label_fix": "Fix",
    "changelog_label_improvement": "Improvement",
    "changelog_label_dependency": "Dependency",
    "$data": {
        "v2.0.0": {
            "released_date": "2026/01/02",
            "improvement": ["Faster drawing"],
            "hint": ["Breaking change"],
            "fix": ["Crash on close"],
        },
        "v1.0.0": {"released_date": "2026/01/01", "feature": ["First release"]},
    },
}


class ReleaseNotesTest(unittest.TestCase):
    def test_notes_list_only_the_requested_version_in_category_order(self):
        notes = release_notes.build_notes(CHANGELOG, "2.0.0", "abc123")
        self.assertTrue(notes.startswith("ImGui 2.0.0\n"))
        self.assertIn("Source: `abc123`", notes)
        self.assertIn("### 2.0.0\n\n- Hint: Breaking change\n- Fix: Crash on close\n- Improvement: Faster drawing\n", notes)
        self.assertNotIn("First release", notes)
        self.assertTrue(notes.endswith("APK checksums are in `SHA256SUMS`.\n"))

    def test_missing_version_is_rejected(self):
        with self.assertRaises(ValueError):
            release_notes.build_notes(CHANGELOG, "3.0.0", "abc123")

    def test_empty_version_is_rejected(self):
        changelog = dict(CHANGELOG, **{"$data": {"v1.0.1": {"released_date": "2026/01/03"}}})
        with self.assertRaises(ValueError):
            release_notes.build_notes(changelog, "1.0.1", "abc123")

    def test_repository_changelog_has_notes_for_the_current_version(self):
        root = Path(__file__).resolve().parents[1]
        version = next(
            line.split("=", 1)[1].strip()
            for line in (root / "version.properties").read_text(encoding="utf-8").splitlines()
            if line.startswith("VERSION_NAME=")
        )
        changelog = json.loads((root / ".changelog" / "lang_en.json").read_text(encoding="utf-8"))
        self.assertIn("### " + version, release_notes.build_notes(changelog, version, "HEAD"))


if __name__ == "__main__":
    unittest.main()
