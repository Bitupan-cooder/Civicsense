from PIL import Image

im = Image.open("public/flat-assets/civic-cutouts/char-1-recycling.png").resize((45, 30))
pix = im.load()
print("\n=== Final char-1-recycling.png ===")
for y in range(30):
    row = ""
    for x in range(45):
        a = pix[x, y][3]
        if a > 0:
            r = pix[x, y][0]
            row += "O" if r > 200 else "#"
        else:
            row += " "
    print(row)

