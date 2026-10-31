from PIL import Image
import os

for f in sorted(os.listdir("Flat Assets/civic")):
    if f.endswith(".png"):
        p = os.path.join("Flat Assets/civic", f)
        im = Image.open(p)
        thumb = im.resize((50, 50))
        colors = thumb.getcolors(maxcolors=2500)
        colors.sort(key=lambda x: x[0], reverse=True)
        print(f"=== {f} ===")
        print("Top 5 colors (count, (R,G,B)):", colors[:5])
