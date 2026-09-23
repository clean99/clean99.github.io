#!/usr/bin/env python3
"""
Rebuild src/assets/fonts from the @fontsource-variable packages, trimmed for first paint.

    python3 -m pip install fonttools brotli   # once
    pnpm fonts                                # after bumping an @fontsource-variable package

Every face on the home page is fetched before the first paint, so its bytes sit directly on
the mobile LCP. Two trims account for nearly all of the savings:

  - JetBrains Mono loses `calt`, its programming ligatures. Code on this site should show the
    characters that were typed (`!==`, `=>`), and the ligature glyphs are half the file.
  - The kerning exceptions (PairPos format 1) are pruned to pairs of ASCII letters and the
    common typographic punctuation. Newsreader carries about 6,000 exceptions, three quarters of
    them for accented letters, each with its own weight-axis delta. Accented letters keep the
    class kerning of their base letter, and every ASCII pair keeps its variable kerning.

Glyph outlines, advances and vertical metrics are untouched; the script asserts it, because
the fallback faces in src/styles/fonts.css are tuned to those metrics.
"""

import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules/@fontsource-variable"
TARGET = ROOT / "src/assets/fonts"

FONTS = {
    "fraunces-latin-wght-normal.woff2": "fraunces",
    "fraunces-latin-wght-italic.woff2": "fraunces",
    "newsreader-latin-wght-normal.woff2": "newsreader",
    "newsreader-latin-wght-italic.woff2": "newsreader",
    "jetbrains-mono-latin-wght-normal.woff2": "jetbrains-mono",
}

DROPPED_FEATURES = {"calt"}

# Curly quotes, dashes and the ellipsis sit next to letters in almost every sentence.
KERNED_PUNCTUATION = {0x2018, 0x2019, 0x201C, 0x201D, 0x2013, 0x2014, 0x2026}


def prune_kerning_exceptions(font: TTFont) -> None:
    if "GPOS" not in font:
        return
    kept = {g for u, g in font.getBestCmap().items() if u < 0x80 or u in KERNED_PUNCTUATION}
    gpos = font["GPOS"].table
    for record in gpos.FeatureList.FeatureRecord:
        if record.FeatureTag != "kern":
            continue
        for index in record.Feature.LookupListIndex:
            for table in gpos.LookupList.Lookup[index].SubTable:
                pair = getattr(table, "ExtSubTable", table)
                if pair.Format != 1:
                    continue
                firsts, sets = [], []
                for first, pair_set in zip(pair.Coverage.glyphs, pair.PairSet):
                    if first in kept:
                        pair_set.PairValueRecord = [r for r in pair_set.PairValueRecord if r.SecondGlyph in kept]
                        pair_set.PairValueCount = len(pair_set.PairValueRecord)
                    else:
                        pair_set.PairValueRecord = []
                    if pair_set.PairValueRecord:
                        firsts.append(first)
                        sets.append(pair_set)
                pair.Coverage.glyphs = firsts
                pair.PairSet = sets
                pair.PairSetCount = len(sets)

    # Drop the weight-axis deltas that only the pruned pairs referenced.
    gdef = font["GDEF"].table
    if getattr(gdef, "VarStore", None):
        used: set[int] = set()
        gpos.collect_device_varidxes(used)
        if hasattr(gdef, "collect_device_varidxes"):
            gdef.collect_device_varidxes(used)
        mapping = gdef.VarStore.subset_varidxes(used)
        gpos.remap_device_varidxes(mapping)
        if hasattr(gdef, "remap_device_varidxes"):
            gdef.remap_device_varidxes(mapping)


def metrics(font: TTFont) -> tuple:
    os2, hhea, head = font["OS/2"], font["hhea"], font["head"]
    advances = {font.getBestCmap()[u]: font["hmtx"][g][0] for u, g in font.getBestCmap().items()}
    return (
        head.unitsPerEm,
        hhea.ascent,
        hhea.descent,
        hhea.lineGap,
        os2.sTypoAscender,
        os2.sTypoDescender,
        os2.sTypoLineGap,
        os2.usWinAscent,
        os2.usWinDescent,
        os2.sxHeight,
        os2.sCapHeight,
        sorted(advances.items()),
    )


def optimize(name: str, package: str) -> tuple[int, int]:
    source = SOURCE / package / "files" / name
    original = source.read_bytes()
    font = TTFont(io.BytesIO(original))
    before = metrics(font)
    features = {r.FeatureTag for tag in ("GSUB", "GPOS") if tag in font for r in font[tag].table.FeatureList.FeatureRecord}

    options = subset.Options()
    options.layout_features = sorted(features - DROPPED_FEATURES)
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.flavor = "woff2"
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=font.getBestCmap().keys())
    subsetter.subset(font)
    prune_kerning_exceptions(font)

    if metrics(font) != before:
        sys.exit(f"{name}: metrics changed; src/styles/fonts.css would no longer match")

    out = io.BytesIO()
    font.flavor = "woff2"
    font.save(out)
    (TARGET / name).write_bytes(out.getvalue())
    return len(original), len(out.getvalue())


def main() -> None:
    for name, package in FONTS.items():
        before, after = optimize(name, package)
        print(f"{name:42} {before / 1024:5.1f} KB -> {after / 1024:5.1f} KB")


if __name__ == "__main__":
    main()
