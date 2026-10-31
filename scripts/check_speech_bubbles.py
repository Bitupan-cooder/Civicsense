from PIL import Image

for name in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{name}")
    w, h = im.size
    print(f"\n{name} ({w}x{h}):")
    # let's check the top 30% of each image
    top = im.crop((0, 0, w, h//3)).resize((50, 15))
    pix = top.load()
    for y in range(15):
        row = ""
        for x in range(50):
            r, g, b = pix[x, y][:3]
            is_checker = (205 <= r <= 250) and abs(r-g) <= 5 and abs(g-b) <= 5
            row += " " if is_checker else "#"
        print(row)

