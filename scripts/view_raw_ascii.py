from PIL import Image

im = Image.open("char1_full_raw.png").resize((50, 35))
pix = im.load()
for y in range(35):
    row = ""
    for x in range(50):
        r, g, b = pix[x, y][:3]
        # White lines
        if (r > 120 and b > 140) or (r > 160 and g > 200 and b > 170):
            row += "O"
        elif g > r + 30 and g > b + 30:
            row += "."
        else:
            row += " "
    print(row)

