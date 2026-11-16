"""
Reads the Spindel 4 board from a screenshot.

The board is a square canvas; the hub is in the middle. Slice k sits at
angle k * 22.5 degrees (0 = pointing right, going clockwise on screen).
Ring r's cell centre is at RING_POS[r] * half-width from the middle.
"""
import io
import math

from PIL import Image

from engine import S, R

# measured from the live game (fraction of half the board square)
RING_POS = [0.137, 0.222, 0.333, 0.443, 0.554, 0.666, 0.777]


def cell_xy(box, s, r):
    x, y, w, h = box
    cx, cy = x + w / 2, y + h / 2
    half = min(w, h) / 2
    a = math.radians(s * 360.0 / S)
    rad = RING_POS[r] * half
    return cx + rad * math.cos(a), cy + rad * math.sin(a)


def _sample(img, x, y, spread):
    pts = [(0, 0), (spread, 0), (-spread, 0), (0, spread), (0, -spread)]
    acc = [0, 0, 0]
    n = 0
    for dx, dy in pts:
        px = img.getpixel((int(x + dx), int(y + dy)))
        for k in range(3):
            acc[k] += px[k]
        n += 1
    return tuple(a / n for a in acc)


def is_empty_color(c):
    r, g, b = c
    # empty web cells are cream / pale yellow / orange-ish background
    sat = max(c) - min(c)
    return (r > 185 and g > 150 and b < 235 and r >= b) and not (r > 200 and g < 130)


def read_colors(png_bytes, box, scale=1.0):
    """Returns cells[s][r] = None or an (r,g,b) colour."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    bx = tuple(v * scale for v in box)
    half = min(bx[2], bx[3]) / 2
    out = []
    for s in range(S):
        col = []
        for r in range(R):
            x, y = cell_xy(bx, s, r)
            spread = max(1.0, half * (0.012 if r == 0 else 0.025))
            c = _sample(img, x, y, spread)
            col.append(None if is_empty_color(c) else c)
        out.append(col)
    return out


def color_dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5
