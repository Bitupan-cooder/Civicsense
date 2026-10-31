from PIL import Image

for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{f}").resize((80, 40))
    pix = im.load()
    print(f"\n=================== {f} ===================")
    for y in range(40):
        row = ""
        for x in range(80):
            r, g, b = pix[x, y][:3]
            is_checker = (210 <= r <= 245) and (abs(r - g) <= 6) and (abs(g - b) <= 6)
            if is_checker:
                row += " "
            elif g > r + 30 and g > b + 30:
                row += "@" # Green
            elif r > 200 and g > 200 and b > 200:
                row += "#" # White
            else:
                row += "."
        print(row)

