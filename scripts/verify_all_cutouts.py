from PIL import Image

for name in ["char-1-recycling.png", "char-2-planting.png", "char-3-megaphone.png", "char-4-auditor.png", "char-5-dispatch.png"]:
    im = Image.open(f"public/flat-assets/civic-cutouts/{name}").resize((40, 25))
    pix = im.load()
    print(f"\n=== {name} ({im.size}) ===")
    for y in range(25):
        row = ""
        for x in range(40):
            a = pix[x, y][3]
            if a > 0:
                r = pix[x, y][0]
                row += "O" if r > 200 else "#"
            else:
                row += " "
        print(row)

