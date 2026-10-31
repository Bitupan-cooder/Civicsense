from PIL import Image

im = Image.open("public/flat-assets/civic-cutouts/char-1-recycling.png")
w, h = im.size
pix = im.load()
for y in range(h - 20, h):
    for x in range(w - 50, w):
        if pix[x, y][3] > 0:
            print(f"Non-transparent at ({x},{y}): {pix[x, y]}")

