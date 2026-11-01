#!/usr/bin/env python3
"""Checks the precision of app/src/main/assets/types/imgui.d.ts and type-checks the code that uses it.

Usage: python tools/check_types.py [--no-tsc] [--list] [--members]

- The declarations do not use the type `unknown`, rest parameters of `any`, or Options that extend Record<string, any>.
- Every member of an interface, nested object types included, has a JSDoc comment. An overload shares the comment of the
  signature before it. --list prints the members without one, by interface. --members prints the number of members of each
  interface, for docs/API-COVERAGE-HANDOVER.md.
- tsc with app/src/test/types/tsconfig.json: `strict` over imgui-smoke.ts and all bundled examples (checkJs). CI installs
  TypeScript 5.1.3 for this. --no-tsc skips the step.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import shutil
import subprocess
import sys

REPOSITORY_ROOT = pathlib.Path(__file__).resolve().parents[1]
DECLARATIONS = REPOSITORY_ROOT / "app/src/main/assets/types/imgui.d.ts"
TS_CONFIG = REPOSITORY_ROOT / "app/src/test/types/tsconfig.json"
EXAMPLES = REPOSITORY_ROOT / "app/src/main/assets/examples"

MEMBER = re.compile(r"^\s+(?:readonly\s+)?(\[[^\]]+\]|\d+|\w+)\??(?:<[^(]*>)?[(:]")
INTERFACE = re.compile(r"^\s*(?:declare\s+)?interface\s+(\w+)")


def strip_code(line: str, in_comment: bool) -> tuple[str, bool]:
    """Removes comments and string contents from one line."""
    code = []
    index = 0
    while index < len(line):
        if in_comment:
            end = line.find("*/", index)
            if end < 0:
                return "".join(code), True
            index = end + 2
            in_comment = False
        elif line.startswith("/*", index):
            in_comment = True
            index += 2
        elif line.startswith("//", index):
            break
        elif line[index] in "\"'`":
            quote = line[index]
            index += 1
            while index < len(line) and line[index] != quote:
                index += 2 if line[index] == "\\" else 1
            index += 1
        else:
            code.append(line[index])
            index += 1
    return "".join(code), in_comment


def interface_members(source: str) -> list[tuple[str, int, str, bool]]:
    """Returns (interface, line number, member, has a JSDoc comment) of each member of an interface."""
    members = []
    lines = source.splitlines()
    in_comment = False
    braces = 0
    round_brackets = 0
    interface = ""
    interface_depth = -1
    documented_name = ""
    for number, line in enumerate(lines, 1):
        stripped = line.strip()
        ends_doc = stripped.endswith("*/")
        code, in_comment_next = strip_code(line, in_comment)
        was_in_comment = in_comment
        in_comment = in_comment_next
        if not was_in_comment and not stripped.startswith("/*") and interface and braces >= interface_depth and round_brackets == 0:
            member = MEMBER.match(line)
            if member is not None:
                name = member.group(1)
                previous = lines[number - 2].strip() if number >= 2 else ""
                documented = previous.endswith("*/") or name == documented_name
                documented_name = name if documented else ""
                members.append((interface, number, name, documented))
        declared = INTERFACE.match(line)
        if declared is not None:
            interface = declared.group(1)
            interface_depth = braces + 1
        braces += code.count("{") - code.count("}")
        round_brackets += code.count("(") - code.count(")")
        if interface and braces < interface_depth:
            interface = ""
        if ends_doc and was_in_comment:
            documented_name = ""
    return members


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-tsc", action="store_true", help="skip the tsc step")
    parser.add_argument("--list", action="store_true", help="print the members without a JSDoc comment")
    parser.add_argument("--members", action="store_true", help="print the number of members of each interface")
    arguments = parser.parse_args()

    source = DECLARATIONS.read_text(encoding="utf-8")
    failures = 0

    unknown_count = len(re.findall(r"\bunknown\b", source))
    print(f"{'PASS' if unknown_count == 0 else 'FAIL'} unknown count={unknown_count}")
    failures += unknown_count != 0

    loose = re.findall(r"\.\.\.\w+: any\[\]|extends Record<string, any>", source)
    print(f"{'PASS' if not loose else 'FAIL'} loose signatures count={len(loose)}")
    failures += bool(loose)

    members = interface_members(source)
    missing = [member for member in members if not member[3]]
    print(f"{'PASS' if not missing else 'FAIL'} JSDoc undocumented members={len(missing)}")
    failures += bool(missing)
    if arguments.list:
        for interface, number, name, _ in missing:
            print(f"  {interface}.{name} line {number}")
    if arguments.members:
        by_interface: dict[str, set[str]] = {}
        for interface, _, name, _ in members:
            by_interface.setdefault(interface, set()).add(name)
        for interface in sorted(by_interface):
            print(f"  {interface} {len(by_interface[interface])}")

    examples = sorted(EXAMPLES.glob("*.js"))
    if not arguments.no_tsc:
        tsc = shutil.which("tsc")
        if tsc is None:
            print("FAIL tsc not found: npm install --global typescript@5.1.3")
            failures += 1
        else:
            result = subprocess.run(
                [tsc, "--project", str(TS_CONFIG)], cwd=REPOSITORY_ROOT,
                capture_output=True, text=True, encoding="utf-8",
            )
            errors = result.stdout.count("error TS")
            print(f"{'PASS' if result.returncode == 0 else 'FAIL'} tsc strict examples={len(examples)} errors={errors}")
            if result.returncode != 0:
                print(result.stdout[-4000:], end="")
                failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
