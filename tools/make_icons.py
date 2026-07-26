#!/usr/bin/env python3
"""Icon generator for the Travis Picker PWA — no dependencies.

The runtime is deliberately no-build/no-deps, and this machine has no
PIL/ImageMagick/Node, so this script decodes and encodes PNGs by hand (stdlib
`zlib` + `struct`) and resamples with its own area filter. It is an *authoring*
tool: run it whenever the mark changes, commit the PNGs it drops in `icons/`,
and forget it. Nothing at runtime imports it.

    python3 tools/make_icons.py

THE MARK (session 15): a thumbs-up wearing a thumbpick, on a rust disc over the
faceplate brown — the app's own subject (your right hand, thumb leading) and an
approval gesture in one shape. It is drawn artwork, kept in `icon-master.png`
(640×640, downscaled from a 1254×1254 original); this script only frames and
resamples it. The flat-graphic treatment is the reason it works: three values
and a silhouette survive being shrunk to a favicon, where rendered volume and
fine linework turn to mush. That was established by measurement, not taste —
six candidate treatments were downscaled to 32px and compared.

THE FRAMING. Everything is judged against the **maskable safe zone**: a centre
circle of radius 0.40, the only region Android guarantees a mask will not crop
(iOS applies its own squircle, and neither honours corners you draw yourself,
which is why there is no frame or rounded corner in the art). The master's cream
artwork reached r=0.421 — the wrist dipped just past it — so FIT insets the art
and pads with BORDER. That padding is invisible because the master's border is
flat to within 5/255. `main()` re-measures the finished 512 and refuses to write
if the art has drifted back outside.
"""
import math
import os
import struct
import zlib

MASTER = "icon-master.png"

# Inset applied to the master so its artwork clears the safe zone (0.400/0.421,
# plus a little margin). Everything outside the inset art is filled with BORDER,
# sampled from the master's own edge — the seam is invisible at any icon size.
FIT = 0.93
BORDER = (0x36, 0x27, 0x1a)

SAFE_R = 0.40      # maskable safe zone: a centre circle of this radius
LUM_ART = 170      # luminance above which a pixel counts as the cream artwork

# size -> filename. The 180 is the iOS home-screen icon (apple-touch-icon);
# 192/512 feed the manifest; 32 is the browser-tab favicon.
TARGETS = {
    180: "apple-touch-icon.png",
    192: "icon-192.png",
    512: "icon-512.png",
    32:  "favicon-32.png",
}


# ------------------------------------------------------------------- png -----
def read_png(path):
    """Decode an 8-bit RGB/RGBA PNG to (w, h, flat RGB bytearray)."""
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
    """Frame the master into a `size`×`size` icon: inset by FIT, pad with BORDER,
    and area-average down. Returns (flat RGB bytearray, max artwork radius)."""
    px = bytearray(size * size * 3)
    max_r = 0.0
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

            if 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2] > LUM_ART:
                r = math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5)
                if r > max_r:
                    max_r = r
    return px, max_r


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), MASTER)
    out = os.path.join(root, "icons")
    os.makedirs(out, exist_ok=True)

    print(f"Reading {MASTER} …")
    sw, sh, spx = read_png(src)
    if sw != sh:
        raise SystemExit(f"{MASTER} must be square (got {sw}×{sh})")
    sats = summed_area(sw, sh, spx)

    print("Rendering icons:")
    rendered = {size: render(size, sw, sh, sats) for size in TARGETS}

    # Verify the safe zone by measurement, not by eye: the 512 is the truth.
    max_r = rendered[512][1]
    print(f"  artwork reaches r={max_r:.3f} of {SAFE_R:.2f} maskable safe radius")
    if max_r > SAFE_R:
        raise SystemExit("ABORT: the artwork sits outside the maskable safe "
                         f"zone (r={max_r:.3f} > {SAFE_R:.2f}). Lower FIT.")

    for size, name in sorted(TARGETS.items(), reverse=True):
        write_png(os.path.join(out, name), size, rendered[size][0])
    print("Done.")


if __name__ == "__main__":
    main()
