# Bundled fallback fonts

These font assets are loaded through Android `AssetManager` by the native ImGui runtime.

## AutoJs6CjkFallback-Regular.otf

- Source: Noto Sans SC Regular from Noto CJK 2.004 (`Sans2.004`, source commit `523d033d6cb47f4a80c58a35753646f5c3608a78`).
- Upstream: <https://github.com/notofonts/noto-cjk>
- License: SIL Open Font License 1.1; see `LICENSE-NOTO-OFL.txt`.
- Subset: printable Latin, common punctuation/symbol blocks, kana, Bopomofo, Hangul compatibility jamo, full-width forms, and every character encodable by GB 2312. The subset contains about 9,800 Unicode characters.
- SHA-256: `37D12BE5931E07B2615A25E31600F9E13465BE6DCE39C3F0DFBAC9AFD8953124`

The subset is a last-resort CJK fallback for stripped Android systems. Native initialization still prefers a readable caller-supplied font or a system Noto/Droid CJK font.

## AutoJs6MaterialIcons-Subset.ttf

- Source: Material Icons Regular from Google's `material-design-icons` repository at commit `84ccef280841abfac506afc4ad4a2782f6d0a1d0`.
- Upstream: <https://github.com/google/material-design-icons>
- License: Apache License 2.0; see `LICENSE-MATERIAL-ICONS-APACHE-2.0.txt`.
- Subset: only the private-use glyphs exposed by `imgui.Icons` / `imgui.icon(name)`.
- SHA-256: `816E1C8F5D806A0B21F8451672DCCDB88E927A6150DE2BA5252E93CFF474BDFF`

When changing either subset, update its API map, coverage description, hash, and license/source metadata together.
