from PIL import Image

im = Image.open("scratch_char1_raw.png").resize((44, 25))
pix = im.load()
for y in range(25):
    row = ""
    for x in range(44):
        r, g, b = pix[x, y][:3]
        if r > 180 and g > 180 and b > 180:
            row += "#"
        elif g > r + 20:
            row += "."
        else:
            row += " "
    print(row)

