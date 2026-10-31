from PIL import Image
import os

for f in sorted(os.listdir("Flat Assets/civic")):
    if not f.endswith(".png"): continue
    im = Image.open(os.path.join("Flat Assets/civic", f))
    # print non-grey pixels
    w, h = im.size
    print(f"\n{f} (size {w}x{h}):")
    # sample some pixels across the image
    pixels = im.load()
    distinct_colors = {}
    for y in range(0, h, 20):
        for x in range(0, w, 20):
            c = pixels[x, y]
            distinct_colors[c] = distinct_colors.get(c, 0) + 1
    # print top 10
    top = sorted(distinct_colors.items(), key=lambda x: x[1], reverse=True)[:10]
    for c, cnt in top:
        print(f"  color {c}: {cnt}")

