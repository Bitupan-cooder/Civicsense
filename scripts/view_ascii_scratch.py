from PIL import Image

# Let's inspect the 4 files in scratch_chars by generating small text representations
for f in ["clean_1793475803107.png", "clean_1793475836520.png", "clean_1793475871836.png", "clean_1793475909720.png"]:
    im = Image.open(f"scratch_chars/{f}").resize((40, 20))
    pix = im.load()
    print(f"\n=== {f} ===")
    for y in range(20):
        row = ""
        for x in range(40):
            r, g, b, a = pix[x, y]
            row += "#" if a > 120 else " "
        print(row)

