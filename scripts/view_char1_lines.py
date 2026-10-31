from PIL import Image

im = Image.open("scratch_char1_lines.png").resize((40, 25))
pix = im.load()
for y in range(25):
    row = ""
    for x in range(40):
        a = pix[x, y][3]
        row += "#" if a > 100 else " "
    print(row)

