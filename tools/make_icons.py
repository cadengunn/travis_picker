#!/usr/bin/env python3
"""One-time icon generator for the Travis Picker PWA — no dependencies.

The runtime is deliberately no-build/no-deps, and this machine has no
PIL/ImageMagick/Node, so this script encodes PNGs by hand (stdlib `zlib` +
`struct`) and supersamples for smooth circles. It is an *authoring* tool: run it
once (or whenever the mark changes), commit the PNGs it drops in `icons/`, and
forget it. Nothing at runtime imports it.

    python3 tools/make_icons.py

Design: the app's own visual language — note circles on the merle background.
Bottom row = thumb domain (active orange), top row = fingers (accent cream),
the bottom-left downbeat largest. The whole mark sits inside the maskable
"safe zone" (central 80%) so one piece of art serves normal, maskable, and
iOS-masked icons alike. No rounded corners: every platform applies its own mask.
"""
import os
import struct
import zlib

# ---- merle palette (matches themes.json default + index.html theme-color) ----
BG     = (0x33, 0x24, 0x1a)
ORANGE = (0xe0, 0xa4, 0x58)  # --active (thumb notes)
CREAM  = (0xe8, 0xdc, 0xc0)  # --accent (finger notes)

# Composition in normalized [0,1] coords (y grows downward), so it scales to any
# size. All circles stay within [0.21, 0.81] → inside the central-80% safe zone.
CIRCLES = [
    # (cx,   cy,   r,     color)  — bottom row = thumb (orange), top = fingers
    (0.365, 0.635, 0.175, ORANGE),  # beat-1 downbeat, the anchor: biggest
    (0.640, 0.640, 0.150, ORANGE),
    (0.375, 0.370, 0.130, CREAM),
    (0.635, 0.365, 0.150, CREAM),
]

SS = 4  # supersamples per axis (16 per pixel) for anti-aliasing


def render(size):
    """Return a flat RGBA bytearray for a `size`×`size` icon."""
    px = bytearray(size * size * 4)
    inv = 1.0 / size
    step = 1.0 / (SS * size)
    half = step / 2.0
    for y in range(size):
        base_v = y * inv
        for x in range(size):
            base_u = x * inv
            ar = ag = ab = 0
            for sy in range(SS):
                v = base_v + sy * step + half
                for sx in range(SS):
                    u = base_u + sx * step + half
                    col = BG
                    for cx, cy, r, c in CIRCLES:
                        du = u - cx
                        dv = v - cy
                        if du * du + dv * dv <= r * r:
                            col = c  # later circles paint over earlier ones
                    ar += col[0]
                    ag += col[1]
                    ab += col[2]
            n = SS * SS
            i = (y * size + x) * 4
            px[i]     = ar // n
            px[i + 1] = ag // n
            px[i + 2] = ab // n
            px[i + 3] = 255
    return px


def write_png(path, size, px):
    """Encode a flat RGBA bytearray as an 8-bit PNG (color type 6)."""
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    # scanlines with filter byte 0 (None) prefixed to each row
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)
        raw += px[y * stride:(y + 1) * stride]

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"  {path}  ({size}×{size}, {len(png)} bytes)")


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, "icons")
    os.makedirs(out, exist_ok=True)

    # size -> filename. The 180 is the iOS home-screen icon (apple-touch-icon);
    # 192/512 feed the manifest; 32 is the browser-tab favicon.
    targets = {
        180: "apple-touch-icon.png",
        192: "icon-192.png",
        512: "icon-512.png",
        32:  "favicon-32.png",
    }
    print("Rendering icons (this takes a moment — pure-Python supersampling):")
    # Render each size once; the art is already safe-zone-compliant, so the same
    # bytes serve the maskable manifest entries too (no separate maskable file).
    for size, name in sorted(targets.items(), reverse=True):
        write_png(os.path.join(out, name), size, render(size))
    print("Done.")


if __name__ == "__main__":
    main()
