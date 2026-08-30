#!/usr/bin/env python3
"""Verify or update the repository's immutable Dear ImGui source snapshot."""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
UPSTREAM_ROOT = REPOSITORY_ROOT / "app/src/main/cpp/third_party/imgui"
MANIFEST_PATH = UPSTREAM_ROOT / "UPSTREAM.sha256"
METADATA_PATH = UPSTREAM_ROOT / "UPSTREAM.md"
VERSION_PATH = REPOSITORY_ROOT / "version.properties"
SOURCE_FILES = (
    "imconfig.h",
    "imgui_demo.cpp",
    "imgui_draw.cpp",
    "imgui_internal.h",
    "imgui_tables.cpp",
    "imgui_widgets.cpp",
    "imgui.cpp",
    "imgui.h",
    "imstb_rectpack.h",
    "imstb_textedit.h",
    "imstb_truetype.h",
    "LICENSE.txt",
    "backends/imgui_impl_android.cpp",
    "backends/imgui_impl_android.h",
    "backends/imgui_impl_opengl3_loader.h",
    "backends/imgui_impl_opengl3.cpp",
    "backends/imgui_impl_opengl3.h",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest() -> dict[str, str]:
    entries: dict[str, str] = {}
    for line_number, line in enumerate(MANIFEST_PATH.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
        if not match:
            raise RuntimeError(f"Malformed {MANIFEST_PATH.name} line {line_number}: {line!r}")
        entries[match.group(2)] = match.group(1)
    return entries


def verify_current_snapshot() -> None:
    manifest = read_manifest()
    expected_names = set(SOURCE_FILES)
    if set(manifest) != expected_names:
        missing = sorted(expected_names - set(manifest))
        unexpected = sorted(set(manifest) - expected_names)
        raise RuntimeError(f"Upstream manifest inventory mismatch; missing={missing}, unexpected={unexpected}")
    mismatches: list[str] = []
    for relative_path in SOURCE_FILES:
        source = UPSTREAM_ROOT / relative_path
        actual = sha256(source) if source.is_file() else "missing"
        if actual != manifest[relative_path]:
            mismatches.append(f"{relative_path}: expected {manifest[relative_path]}, got {actual}")
    if mismatches:
        raise RuntimeError("Vendored Dear ImGui snapshot changed:\n  " + "\n  ".join(mismatches))


def download_archive(commit: str, destination: Path) -> str:
    url = f"https://github.com/ocornut/imgui/archive/{commit}.tar.gz"
    request = urllib.request.Request(url, headers={"User-Agent": "AutoJs6-Plugin-ImGui-updater"})
    digest = hashlib.sha256()
    with urllib.request.urlopen(request, timeout=60) as response, destination.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            digest.update(chunk)
            output.write(chunk)
    return digest.hexdigest()


def extract_snapshot(archive: Path, destination: Path) -> None:
    wanted = set(SOURCE_FILES)
    extracted: set[str] = set()
    with tarfile.open(archive, "r:gz") as bundle:
        for member in bundle.getmembers():
            parts = Path(member.name).parts
            if len(parts) < 2 or not member.isfile():
                continue
            relative_path = Path(*parts[1:]).as_posix()
            if relative_path not in wanted:
                continue
            source = bundle.extractfile(member)
            if source is None:
                raise RuntimeError(f"Unable to read {relative_path} from archive")
            target = destination / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            with source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
            extracted.add(relative_path)
    missing = sorted(wanted - extracted)
    if missing:
        raise RuntimeError(f"Archive is missing required Dear ImGui files: {missing}")


def verify_version(snapshot: Path, tag: str) -> str:
    expected = tag.removeprefix("v")
    header = (snapshot / "imgui.h").read_text(encoding="utf-8")
    match = re.search(r'^#define\s+IMGUI_VERSION\s+"([^"]+)"', header, re.MULTILINE)
    actual = match.group(1) if match else "missing"
    if actual != expected:
        raise RuntimeError(f"Tag/version mismatch: requested {tag}, imgui.h declares {actual}")
    return expected


def changed_files(snapshot: Path) -> list[str]:
    return [
        relative_path
        for relative_path in SOURCE_FILES
        if not (UPSTREAM_ROOT / relative_path).is_file()
        or sha256(snapshot / relative_path) != sha256(UPSTREAM_ROOT / relative_path)
    ]


def write_manifest() -> None:
    lines = [f"{sha256(UPSTREAM_ROOT / path)}  {path}" for path in sorted(SOURCE_FILES)]
    MANIFEST_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def update_metadata(tag: str, commit: str, archive_digest: str) -> None:
    metadata = METADATA_PATH.read_text(encoding="utf-8")
    metadata = re.sub(r"(?m)^- Tag: .+$", f"- Tag: `{tag}`", metadata)
    metadata = re.sub(r"(?m)^- Commit: .+$", f"- Commit: `{commit}`", metadata)
    archive_line = f"- Archive SHA-256: `{archive_digest}`"
    if re.search(r"(?m)^- Archive SHA-256: .+$", metadata):
        metadata = re.sub(r"(?m)^- Archive SHA-256: .+$", archive_line, metadata)
    else:
        metadata = re.sub(r"(?m)(^- Commit: .+$)", rf"\1\n{archive_line}", metadata, count=1)
    METADATA_PATH.write_text(metadata, encoding="utf-8", newline="\n")


def update_version(version: str) -> None:
    properties = VERSION_PATH.read_text(encoding="utf-8")
    updated, count = re.subn(r"(?m)^IMGUI_VERSION=.+$", f"IMGUI_VERSION={version}", properties)
    if count != 1:
        raise RuntimeError("Unable to update IMGUI_VERSION in version.properties")
    VERSION_PATH.write_text(updated, encoding="utf-8", newline="\n")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the current snapshot and exit")
    parser.add_argument("--tag", help="immutable upstream tag, for example v1.92.10")
    parser.add_argument("--commit", help="full 40-character upstream commit")
    parser.add_argument("--archive", type=Path, help="use a reviewed local GitHub commit archive")
    parser.add_argument("--archive-sha256", help="expected lowercase/uppercase archive SHA-256")
    parser.add_argument("--apply", action="store_true", help="replace the vendored snapshot")
    parser.add_argument("--force", action="store_true", help="allow replacement when current hashes diverge")
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    if arguments.check:
        verify_current_snapshot()
        print(f"Verified {len(SOURCE_FILES)} Dear ImGui files against {MANIFEST_PATH.relative_to(REPOSITORY_ROOT)}")
        return 0
    if not arguments.tag or not arguments.commit:
        raise RuntimeError("--tag and --commit are required for an upgrade")
    if not re.fullmatch(r"[0-9a-fA-F]{40}", arguments.commit):
        raise RuntimeError("--commit must be a full 40-character hexadecimal commit ID")
    if arguments.archive_sha256 and not re.fullmatch(r"[0-9a-fA-F]{64}", arguments.archive_sha256):
        raise RuntimeError("--archive-sha256 must contain 64 hexadecimal characters")
    if arguments.apply and not arguments.archive_sha256:
        raise RuntimeError("--apply requires --archive-sha256")
    if not arguments.force:
        verify_current_snapshot()

    with tempfile.TemporaryDirectory(prefix="imgui-upstream-") as temporary_name:
        temporary = Path(temporary_name)
        archive = temporary / "imgui.tar.gz"
        if arguments.archive:
            shutil.copyfile(arguments.archive.resolve(), archive)
            archive_digest = sha256(archive)
        else:
            archive_digest = download_archive(arguments.commit.lower(), archive)
        print(f"Archive SHA-256: {archive_digest}")
        expected_digest = arguments.archive_sha256.lower() if arguments.archive_sha256 else None
        if expected_digest and archive_digest != expected_digest:
            raise RuntimeError(f"Archive digest mismatch: expected {expected_digest}, got {archive_digest}")

        snapshot = temporary / "snapshot"
        extract_snapshot(archive, snapshot)
        version = verify_version(snapshot, arguments.tag)
        changed = changed_files(snapshot)
        print("Changed vendored files:")
        for relative_path in changed:
            print(f"  {relative_path}")
        if not changed:
            print("  (none)")
        if not arguments.apply:
            print("Dry run complete; pass --apply with the reviewed archive SHA-256 to update.")
            return 0

        for relative_path in SOURCE_FILES:
            target = UPSTREAM_ROOT / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(snapshot / relative_path, target)
        write_manifest()
        update_metadata(arguments.tag, arguments.commit.lower(), archive_digest)
        update_version(version)
        verify_current_snapshot()
        print(f"Applied Dear ImGui {arguments.tag} ({arguments.commit.lower()})")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, tarfile.TarError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
