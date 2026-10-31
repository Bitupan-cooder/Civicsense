from PIL import Image

im = Image.open("c1_segmented.png").resize((50, 35))
pix = im.load()
for y in range(35):
    row = ""
    for x in range(50):
        a = pix[x, y][3]
        if a > 0:
            r, g, b = pix[x, y][:3]
            row += "O" if r > 200 else "#"
        else:
            row += " "
    print(row)

