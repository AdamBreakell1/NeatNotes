#!/usr/bin/env python3
"""Build RecallStride vector artwork from the existing site palette and Inter.

Requires fonttools and brotli. Text is outlined so every exported SVG and PNG
uses the same letterforms without relying on fonts installed on the recipient's
computer. InterVariable.woff2 is unmodified and licensed under the SIL OFL.
"""

from pathlib import Path
from html import escape
import json

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FONT = TTFont(HERE / "InterVariable.woff2")
UPM = FONT["head"].unitsPerEm
CMAP = FONT.getBestCmap()
PALETTE = {
    "canvas": "#f5f7fa",
    "surface": "#ffffff",
    "text": "#192b43",
    "secondary": "#4d6078",
    "border": "#dce4ee",
    "accent": "#236a5e",
    "accentSoft": "#e2f2eb",
    "markBackground": "#20374e",
    "markBorder": "#39566e",
    "markText": "#c1f3e0",
}


def number(value):
    return f"{value:.6f}".rstrip("0").rstrip(".")


def text(value, x, y, size, color=None, weight=700, align="left", tracking=0):
    glyphs = FONT.getGlyphSet(location={"wght": weight})
    scale = size / UPM
    width = sum(glyphs[CMAP[ord(char)]].width * scale for char in value)
    width += max(0, len(value) - 1) * tracking
    start = x - (width / 2 if align == "center" else width if align == "right" else 0)
    offset = 0
    paths = []
    for char in value:
        glyph = glyphs[CMAP[ord(char)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        path = pen.getCommands()
        if path:
            paths.append(
                f'<path d="{path}" transform="translate({number(start + offset)} '
                f'{number(y)}) scale({number(scale)} {number(-scale)})"/>'
            )
        offset += glyph.width * scale + tracking
    return (
        f'<g fill="{color or PALETTE["text"]}" role="img" '
        f'aria-label="{escape(value, quote=True)}">{"".join(paths)}</g>'
    )


def mark(x, y, size):
    glyphs = FONT.getGlyphSet(location={"wght": 820})
    # Match .brand-mark: 34px box, 10px radius, .72rem text, .08em spacing.
    fontsize = size * (11.52 / 34)
    bounds = []
    for char in "RS":
        pen = BoundsPen(glyphs)
        glyphs[CMAP[ord(char)]].draw(pen)
        bounds.append(pen.bounds)
    top = max(bound[3] for bound in bounds)
    bottom = min(bound[1] for bound in bounds)
    baseline = y + size / 2 + ((top + bottom) / 2) * fontsize / UPM
    return (
        f'<rect x="{x}" y="{y}" width="{size}" height="{size}" '
        f'rx="{number(size * 10 / 34)}" fill="{PALETTE["markBackground"]}" '
        f'stroke="{PALETTE["markBorder"]}" stroke-width="{number(size / 34)}"/>'
        + text("RS", x + size / 2, baseline, fontsize, PALETTE["markText"],
               820, "center", fontsize * .08)
    )


def svg(name, width, height, body, description):
    content = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">'
        f'<title id="title">RecallStride — {escape(name)}</title>'
        f'<desc id="desc">{escape(description)}</desc>{body}</svg>\n'
    )
    (HERE / f"{name}.svg").write_text(content)


def poster(name, width, height):
    center = width / 2
    dy = (height - 1080) / 2
    body = f'<rect width="{width}" height="{height}" fill="{PALETTE["canvas"]}"/>'
    body += (
        f'<rect x="72" y="72" width="{width - 144}" height="{height - 144}" '
        f'rx="40" fill="{PALETTE["surface"]}" stroke="{PALETTE["border"]}" stroke-width="2"/>'
    )
    body += mark(center - 84, 300 + dy, 168)
    body += text("RecallStride", center, 581 + dy, 88, weight=700, align="center")
    body += text("Revise · Practise · Code", center, 640 + dy, 30,
                 PALETTE["accent"], 500, "center")
    # Keep story text clear of common overlay controls at the lower edge.
    footer_inset = 320 if height >= 1920 else 131
    body += text("recallstride.com", center, height - footer_inset, 25,
                 PALETTE["secondary"], 400, "center")
    svg(name, width, height, body,
        "The navy RS mark above RecallStride, with the words Revise, Practise and Code. "
        "Recallstride.com appears below on a white card against the site's pale blue background.")


poster("first-post-square", 1080, 1080)
poster("first-post-portrait", 1080, 1350)
poster("first-post-story", 1080, 1920)

# Avatar content stays inside the central circle crop.
svg("profile-avatar", 1024, 1024,
    f'<rect width="1024" height="1024" fill="{PALETTE["markBackground"]}"/>'
    + mark(124, 124, 776),
    "RecallStride's pale mint RS letters on the same navy background as the website's brand mark.")

body = f'<rect width="1200" height="630" fill="{PALETTE["canvas"]}"/>'
body += f'<rect x="42" y="42" width="1116" height="546" rx="30" fill="white" stroke="{PALETTE["border"]}" stroke-width="2"/>'
body += mark(86, 93, 66)
body += text("RecallStride", 174, 138, 35, weight=700)
body += text("Learn it.", 86, 307, 79, weight=740)
body += text("Put it to work.", 86, 395, 79, PALETTE["accent"], 740)
body += text("Revise · Practise · Code", 88, 506, 29, PALETTE["secondary"], 500)
body += text("recallstride.com", 1113, 534, 23, PALETTE["secondary"], 400, "right")
# Three ascending strokes echo the three activities without inventing a logo.
body += f'<path d="M897 402h53M969 338h53M1041 274h53" stroke="{PALETTE["accentSoft"]}" stroke-width="30" stroke-linecap="round"/>'
svg("social-preview", 1200, 630, body,
    "RecallStride. Learn it. Put it to work. Revise, Practise and Code at recallstride.com.")

body = f'<rect width="1500" height="500" fill="{PALETTE["canvas"]}"/>'
body += mark(206, 130, 126)
body += text("RecallStride", 366, 216, 69, weight=700)
body += text("Revise · Practise · Code", 370, 274, 30, PALETTE["accent"], 500)
body += text("recallstride.com", 1406, 429, 24, PALETTE["secondary"], 400, "right")
svg("profile-header", 1500, 500, body,
    "RecallStride's navy and mint mark, RecallStride, Revise, Practise and Code, and recallstride.com.")

(HERE / "brand-palette.json").write_text(json.dumps({
    "source": ["student-layout.css :root", "student-layout.css .brand-mark", "styles.css --font-sans"],
    "font": "Inter",
    "fontSource": "https://github.com/rsms/inter/tree/353b61b9f4430d5f420d56605a6e7993e0941470",
    "palette": PALETTE,
    "wordmark": "RecallStride",
    "tagline": "Revise · Practise · Code",
}, indent=2) + "\n")

print("Built 6 outlined SVGs using RecallStride's current site palette and Inter.")
