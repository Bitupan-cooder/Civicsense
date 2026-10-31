from PIL import Image

im = Image.open("Flat Assets/civic/1793475803107.png")
# Full bbox was: (540, 236, 1944, 1732)
cropped = im.crop((540, 236, 1944, 1732)).resize((50, 40))
pix = cropped.load()
for y in range(40):
    row = ""
    for x in range(50):
        r, g, b = pix[x, y][:3]
        is_checker = (205 <= r <= 250) and abs(r-g) <= 5 and abs(g-b) <= 5
        if is_checker:
            row += " "
        elif r >= 240 and g >= 240 and b >= 240:
            row += "O"
        elif g > r + 15:
            row += "#"
        else:
            row += "."
    print(row)

