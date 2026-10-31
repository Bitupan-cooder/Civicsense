from PIL import Image

for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{f}")
    pix = im.load()
    w, h = im.size
    print(f"\n{f} details:")
    print("Corner top-left:", [pix[x, 0] for x in range(10)])
    print("Row 0, 1:", [pix[0, y] for y in range(10)])

