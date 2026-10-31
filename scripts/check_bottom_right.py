from PIL import Image

im = Image.open("Flat Assets/civic/1793478568782.png")
pix = im.load()
w, h = im.size

# Check bottom right 100x100
for y in range(h - 100, h):
    for x in range(w - 100, w):
        r, g, b = pix[x, y][:3]
        is_checker = (205 <= r <= 250) and (abs(r - g) <= 5) and (abs(g - b) <= 5)
        if not is_checker:
            print(f"Non-checker at ({x}, {y}): RGB=({r}, {g}, {b})")
            break

