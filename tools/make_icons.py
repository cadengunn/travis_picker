#!/usr/bin/env python3
"""Icon generator for the Travis Picker PWA — no dependencies.

The runtime is deliberately no-build/no-deps, and this machine has no
PIL/ImageMagick/Node, so this script decodes and encodes PNGs by hand (stdlib
`zlib` + `struct`) and resamples with its own area filter. It is an *authoring*
tool: run it whenever the mark changes, commit the PNGs it drops in `icons/`,
and forget it. Nothing at runtime imports it.

    python3 tools/make_icons.py

THE MARK: a thumbs-up wearing a thumbpick — the app's own subject (your right
hand, thumb leading) and an approval gesture in one shape. It is drawn artwork,
kept in `icon-master.png`; this script only composites and resamples it.

THE MASTER IS A FINISHED FULL-BLEED ICON (session 47, his artwork). It is a
rendered, textured piece carrying its own frame, its own rounded corners and its
own palette, and it REPLACED two earlier things at once: the flat three-value
mark of session 15, and the brief recolour step that sat here to tint that
mark's hand. Nothing here tints anything now. Three consequences, none optional:

  * IT IS RGBA, 1254×1254. Outside the drawn frame the corners are rgba(0,0,0,0)
    and `read_png` must COMPOSITE them, not drop alpha — see its warning. The
    output stays opaque colour-type-2, because iOS composites black behind any
    alpha in a home-screen icon.
  * IT IS FULL BLEED, so FIT is 1.0 and the maskable safe-zone abort is retired.
    See FIT for what that costs on Android and how to reverse it.
  * IT IS NOT A FLAT GRAPHIC. Session 15 chose a flat treatment by measurement
    (six candidates downscaled to 32px), because rendered volume and fine
    linework turn to mush at favicon size. This art deliberately trades that:
    it was judged at 180/60/32 before adoption and reads at all three, but the
    frame does cost interior space, so the hand is smaller at 32 than it was.
"""
import math
import os
import struct
import zlib

MASTER = "icon-master.png"

# FULL BLEED. The master is a finished icon that already fills its own tile, so
# there is nothing to inset and nothing to pad; 1.0 makes `render` a pure
# area-average downscale.
#
# ⚠️ THIS RETIRES THE MASKABLE SAFE-ZONE ABORT, DELIBERATELY. That check asked
# whether the artwork stayed inside a centre circle of r=0.40, which is the right
# question for a small mark on a flat field and an impossible one for an icon
# whose own frame IS the edge — the frame reaches r=0.588 by construction, so the
# old abort would fire on every run. Measured consequence, so it is a known cost
# rather than a surprise: the manifest still declares `purpose: "any maskable"`,
# and under Android's circle mask the frame's corners are cropped to arcs. The
# hand itself stays fully visible and centred, and Android is not a shipping
# target (iPhone first — see CLAUDE.md), so this is accepted, not overlooked.
# To reverse it, either drop `maskable` from the manifest or generate a second,
# inset variant for the 192/512 entries.
FIT = 1.00

# Used only where alpha is composited and for any edge blend. Sampled from the
# master's own frame, never black — see read_png and write_png.
BORDER = (0x64, 0x49, 0x2a)

# size -> filename. The 180 is the iOS home-screen icon (apple-touch-icon);
# 192/512 feed the manifest; 32 is the browser-tab favicon.
TARGETS = {
    180: "apple-touch-icon.png",
    192: "icon-192.png",
    512: "icon-512.png",
    32:  "favicon-32.png",
}


# ------------------------------------------------------------------- png -----
def read_png(path, over=None):
    """Decode an 8-bit RGB/RGBA PNG to (w, h, flat RGB bytearray).

    ⚠️ AN RGBA MASTER MUST BE COMPOSITED, NOT TRUNCATED. This function used to
    copy the three colour bytes and drop alpha, which is silently catastrophic for
    the current master: its corners outside the drawn frame are rgba(0,0,0,0), so
    truncating alpha turns them into pure BLACK — the exact artifact `write_png`'s
    docstring warns about. Pass `over` (a background RGB tuple) and every pixel is
    composited onto it, so a transparent corner takes the frame's colour instead.
    Left at None for a fully opaque master, where the two are identical."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{path}: not a PNG")
    i, idat, ihdr = 8, b"", None
    while i < len(data):
        ln = struct.unpack(">I", data[i:i + 4])[0]
        tag = data[i + 4:i + 8]
        if tag == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", data[i + 8:i + 8 + ln])
        elif tag == b"IDAT":
            idat += data[i + 8:i + 8 + ln]
        i += 12 + ln
    w, h, depth, ctype = ihdr[0], ihdr[1], ihdr[2], ihdr[3]
    if depth != 8 or ctype not in (2, 6):
        raise SystemExit(f"{path}: need an 8-bit RGB/RGBA PNG (got depth "
                         f"{depth}, colour type {ctype})")
    ch = 3 if ctype == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray(w * h * 3)
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        f = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        pos += stride
        if f:                       # undo the per-scanline filter
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                if f == 1:
                    line[x] = (line[x] + a) & 0xff
                elif f == 2:
                    line[x] = (line[x] + b) & 0xff
                elif f == 3:
                    line[x] = (line[x] + ((a + b) >> 1)) & 0xff
                elif f == 4:
                    p = a + b - c
                    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                    line[x] = (line[x] + pr) & 0xff
        for x in range(w):
            s, o = x * ch, (y * w + x) * 3
            if ch == 4 and over is not None:
                a = line[s + 3]
                if a == 255:
                    out[o:o + 3] = line[s:s + 3]
                else:
                    f = a / 255.0
                    for c in range(3):
                        out[o + c] = int(line[s + c] * f + over[c] * (1.0 - f) + 0.5)
            else:
                out[o:o + 3] = line[s:s + 3]
        prev = line
    return w, h, out


def write_png(path, size, px):
    """Encode a flat RGB bytearray as an 8-bit opaque PNG (colour type 2).

    Opaque on purpose: iOS composites black behind any alpha in a home-screen
    icon, which reads as a bug."""
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    raw = bytearray()
    stride = size * 3
    for y in range(size):
        raw.append(0)               # filter 0 (None) per scanline
        raw += px[y * stride:(y + 1) * stride]

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"  {path}  ({size}×{size}, {len(png)} bytes)")


# -------------------------------------------------------------- resample -----
def summed_area(w, h, px):
    """Per-channel summed-area tables, so any source rectangle averages in O(1).
    That is what makes an exact area filter affordable in pure Python: a 32px
    icon otherwise averages ~400 source pixels per output pixel."""
    sats = []
    for c in range(3):
        sat = [0] * ((w + 1) * (h + 1))
        for y in range(h):
            rowsum = 0
            base, above, cur = y * w * 3 + c, y * (w + 1), (y + 1) * (w + 1)
            for x in range(w):
                rowsum += px[base + x * 3]
                sat[cur + x + 1] = sat[above + x + 1] + rowsum
        sats.append(sat)
    return sats


def box_average(sat, w, x0, y0, x1, y1):
    """Mean of a source rectangle from a summed-area table (integer bounds)."""
    s = w + 1
    total = (sat[y1 * s + x1] - sat[y0 * s + x1]
             - sat[y1 * s + x0] + sat[y0 * s + x0])
    return total / float((x1 - x0) * (y1 - y0))


def render(size, sw, sh, sats):
    """Frame the master into a `size`×`size` icon and area-average down. Returns
    a flat RGB bytearray.

    At FIT 1.0 this is a plain area-average downscale; the inset/pad arithmetic is
    kept because it costs nothing at 1.0 and is what a future inset variant (an
    Android-maskable one, say — see FIT) would need."""
    px = bytearray(size * size * 3)
    for y in range(size):
        # output row -> master rows, via the FIT inset about the centre
        ay0 = ((y / size) - 0.5) / FIT + 0.5
        ay1 = (((y + 1) / size) - 0.5) / FIT + 0.5
        sy0, sy1 = int(math.floor(ay0 * sh)), int(math.ceil(ay1 * sh))
        cy0, cy1 = max(sy0, 0), min(sy1, sh)
        for x in range(size):
            ax0 = ((x / size) - 0.5) / FIT + 0.5
            ax1 = (((x + 1) / size) - 0.5) / FIT + 0.5
            sx0, sx1 = int(math.floor(ax0 * sw)), int(math.ceil(ax1 * sw))
            cx0, cx1 = max(sx0, 0), min(sx1, sw)

            i = (y * size + x) * 3
            if cx1 <= cx0 or cy1 <= cy0:
                px[i:i + 3] = bytes(BORDER)     # wholly outside the master
                continue
            col = [box_average(sats[c], sw, cx0, cy0, cx1, cy1) for c in range(3)]
            # partial overlap at the edge: blend toward the pad colour
            cov = ((cx1 - cx0) * (cy1 - cy0)) / float((sx1 - sx0) * (sy1 - sy0))
            if cov < 1.0:
                col = [col[c] * cov + BORDER[c] * (1.0 - cov) for c in range(3)]
            px[i]     = int(col[0] + 0.5)
            px[i + 1] = int(col[1] + 0.5)
            px[i + 2] = int(col[2] + 0.5)
    return px


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), MASTER)
    out = os.path.join(root, "icons")
    os.makedirs(out, exist_ok=True)

    print(f"Reading {MASTER} …")
    # `over=BORDER` is the load-bearing argument: the master is RGBA and its
    # corners are fully transparent, so without it they decode to black.
    sw, sh, spx = read_png(src, over=BORDER)
    if sw != sh:
        raise SystemExit(f"{MASTER} must be square (got {sw}×{sh})")
    sats = summed_area(sw, sh, spx)

    print("Rendering icons:")
    rendered = {size: render(size, sw, sh, sats) for size in TARGETS}

    # THE ABORT THAT REPLACED THE SAFE-ZONE ONE. A full-bleed icon has no inset to
    # verify, but it does have one way to be silently wrong: a transparent corner
    # composited to black, which on an iOS home screen reads as a broken tile.
    # Checking the finished 512's own corners catches that whatever the master
    # does — including a future master saved without alpha, or with a different
    # frame colour than BORDER.
    corners = []
    for (cx, cy) in ((0, 0), (511, 0), (0, 511), (511, 511)):
        i = (cy * 512 + cx) * 3
        corners.append(tuple(rendered[512][i:i + 3]))
    print("  corners: " + "  ".join("#%02x%02x%02x" % c for c in corners))
    for c in corners:
        if max(c) < 24:
            raise SystemExit(
                f"ABORT: corner {'#%02x%02x%02x' % c} is ~black — the master's "
                "alpha was dropped instead of composited (read_png needs `over`).")

    for size, name in sorted(TARGETS.items(), reverse=True):
        write_png(os.path.join(out, name), size, rendered[size])
    print("Done.")


if __name__ == "__main__":
    main()
