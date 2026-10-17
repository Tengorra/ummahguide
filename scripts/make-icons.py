"""Draws the UmmahGuide app icon (mosque silhouette on emerald) at PNG sizes with Pillow.
Run: python3 scripts/make-icons.py
"""
from PIL import Image, ImageDraw

EM = (11, 61, 51, 255)
IVORY = (244, 241, 234, 255)
GOLD = (201, 164, 76, 255)


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    s = size / 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = 0 if maskable else int(112 * s)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=EM)

    pad = 0.12 if maskable else 0.0  # keep content inside the safe zone when maskable
    def P(x, y):
        return (x * s * (1 - 2 * pad) + size * pad, y * s * (1 - 2 * pad) + size * pad)

    # faint star geometry on its own layer so the alpha actually blends
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    faint = (201, 164, 76, 60)
    ld.rectangle([P(116, 116), P(396, 396)], outline=faint, width=max(1, int(5 * s)))
    pts = [P(256, 58), P(454, 256), P(256, 454), P(58, 256)]
    ld.polygon(pts, outline=faint, width=max(1, int(5 * s)))
    img.alpha_composite(layer)
    d = ImageDraw.Draw(img)

    # dome + base
    d.pieslice([P(176, 150), P(336, 310)], 180, 360, fill=IVORY)
    d.rectangle([P(176, 230), P(336, 294)], fill=IVORY)
    d.rounded_rectangle([P(150, 308), P(362, 332)], radius=int(8 * s), fill=IVORY)
    d.rounded_rectangle([P(238, 128), P(274, 160)], radius=int(10 * s), fill=IVORY)

    # minarets
    d.rounded_rectangle([P(112, 200), P(134, 332)], radius=int(6 * s), fill=GOLD)
    d.rounded_rectangle([P(378, 200), P(400, 332)], radius=int(6 * s), fill=GOLD)
    d.ellipse([P(112, 175), P(134, 197)], fill=GOLD)
    d.ellipse([P(378, 175), P(400, 197)], fill=GOLD)

    # crescent
    d.ellipse([P(226, 70), P(286, 130)], fill=GOLD)
    d.ellipse([P(240, 62), P(300, 122)], fill=EM)
    d.ellipse([P(246, 362), P(266, 382)], fill=GOLD)
    return img


draw_icon(512).save("public/icons/icon-512.png")
draw_icon(192).save("public/icons/icon-192.png")
draw_icon(180).save("public/icons/apple-touch-icon.png")
draw_icon(512, maskable=True).save("public/icons/icon-512-maskable.png")
print("icons written")
