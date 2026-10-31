from PIL import Image

im = Image.open("public/flat-assets/civic-transparent/extracted_1793475836520.png")
pix = im.load()
w, h = im.size
colors = {}
for y in range(0, h, 10):
    for x in range(0, w, 10):
        p = pix[x, y]
        if p[3] > 0:
            c = (p[0]//20*20, p[1]//20*20, p[2]//20*20)
            colors[c] = colors.get(c, 0) + 1

for k, v in sorted(colors.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"Color {k}: {v}")

