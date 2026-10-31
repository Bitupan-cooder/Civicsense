from PIL import Image

# Let's inspect thumb_1793475803107.png to see what each character is
for name in ["thumb_1793475803107.png", "thumb_1793475836520.png", "thumb_1793475871836.png", "thumb_1793475909720.png"]:
    im = Image.open(f"public/flat-assets/civic-transparent/{name}")
    # print non-zero alpha pixels distribution
    w, h = im.size
    pix = im.load()
    colors = {}
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a > 50:
                k = f"({r//40*40},{g//40*40},{b//40*40})"
                colors[k] = colors.get(k, 0) + 1
    print(f"\n{name} ({w}x{h}):")
    for k, v in sorted(colors.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {k}: {v}")

