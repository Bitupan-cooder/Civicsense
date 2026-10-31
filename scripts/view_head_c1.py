from PIL import Image

im = Image.open("c1_with_head.png")
head = im.crop((0, 0, im.width, 120)).resize((50, 25))
pix = head.load()
for y in range(25):
    row = ""
    for x in range(50):
        r, g, b = pix[x, y][:3]
        if (r > 120 and b > 140) or (r > 160 and g > 200 and b > 170):
            row += "O"
        elif g > r + 30 and g > b + 30:
            row += "."
        else:
            row += " "
    print(row)

