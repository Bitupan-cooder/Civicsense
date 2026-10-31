from PIL import Image

im = Image.open("public/flat-assets/civic-cutouts/char-1-recycling.png").resize((40, 25))
pix = im.load()
print("\n=== Final Pristine char-1-recycling.png ===")
for y in range(25):
    row = ""
    for x in range(40):
        a = pix[x, y][3]
        if a > 0:
            r = pix[x, y][0]
            row += "O" if r > 200 else "#"
        else:
            row += " "
    print(row)

