"""Write the GitHub release body of one version from the English changelog.

The official plugin index takes its release notes from this body, so it is
built from .changelog/lang_en.json instead of generated commit notes.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = ["hint", "feature", "fix", "improvement", "dependency"]


def build_notes(changelog, version, source_revision):
    entry = changelog["$data"].get(f"v{version}")
    if entry is None:
        raise ValueError(f"No changelog entry for v{version}")
    items = [
        f"- {changelog[f'changelog_label_{category}']}: {text}"
        for category in CATEGORIES
        for text in entry.get(category, [])
    ]
    if not items:
        raise ValueError(f"Changelog entry v{version} is empty")
    lines = [
        f"ImGui {version}",
        "",
        "Official APKs signed with the AutoJs6 release certificate.",
        "",
        f"Source: `{source_revision}`",
        "",
        f"### {version}",
        "",
        *items,
        "",
        "APK checksums are in `SHA256SUMS`.",
    ]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="version name without the leading v")
    parser.add_argument("--source", required=True, help="commit the release is built from")
    parser.add_argument("--output", required=True, help="file that receives the release body")
    parser.add_argument("--changelog", default=str(ROOT / ".changelog" / "lang_en.json"))
    args = parser.parse_args()
    changelog = json.loads(Path(args.changelog).read_text(encoding="utf-8"))
    Path(args.output).write_text(build_notes(changelog, args.version, args.source), encoding="utf-8")


if __name__ == "__main__":
    main()
