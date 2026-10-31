from PIL import Image

im = Image.open("char1_on_cream_verified.png").resize((40, 25))
pix = im.load()
for y in range(25):
    row = ""
    for x in range(40):
        r, g, b = pix[x, y][:3]
        # Cream background is around (250, 242, 235)
        is_cream = (r > 240 and 235 <= g <= 245 and 225 <= b <= 240)
        if is_cream:
            row += " "
        elif g > r + 20 and g > b + 20:
            row += "#" # Green body
        elif r > 245 and g > 245 and b > 245:
            row += "O" # White outlines
        else:
            row += "."
    print(row)

