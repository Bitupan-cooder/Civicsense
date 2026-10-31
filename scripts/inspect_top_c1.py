from PIL import Image

im = Image.open("c1_exact_box.png")
w, h = im.size
pix = im.load()

# Let's inspect rows 0 to 60 (the head)
top_crop = im.crop((0, 0, w, 70)).resize((50, 20))
tpix = top_crop.load()
for y in range(20):
    row = ""
    for x in range(50):
        r, g, b = tpix[x, y][:3]
        if (r > 130 and b > 135) or (r > 160 and g > 200):
            row += "O"
        elif g > r + 30 and g > b + 30:
            row += "."
        else:
            row += " "
    print(row)

