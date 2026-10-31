from PIL import Image
import os
import glob

for i in range(1, 6):
    files = glob.glob(f"public/flat-assets/civic-cutouts/char-{i}-*.png")
    if files:
        f = files[0]
        im = Image.open(f).resize((40, 20))
        pix = im.load()
        print(f"\n=== {os.path.basename(f)} ({im.size}) ===")
        for y in range(20):
            row = ""
            for x in range(40):
                r, g, b, a = pix[x, y]
                row += "#" if a > 100 else " "
            print(row)
