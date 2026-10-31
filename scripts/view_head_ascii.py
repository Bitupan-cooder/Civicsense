from PIL import Image

im = Image.open("test_head_1793475803107.png").resize((60, 25))
pix = im.load()
for y in range(25):
    row = ""
    for x in range(60):
        r, g, b = pix[x, y][:3]
        is_checker = (205 <= r <= 250) and abs(r-g) <= 5 and abs(g-b) <= 5
        if is_checker:
            row += " "
        elif r >= 240 and g >= 240 and b >= 240:
            row += "O" # White outline
        elif g > r + 15:
            row += "#" # Green fill
        else:
            row += "."
    print(row)

