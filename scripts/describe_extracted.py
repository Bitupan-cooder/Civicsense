from PIL import Image
import os

p = "public/flat-assets/civic-transparent"
for f in sorted(os.listdir(p)):
    if f.endswith(".png"):
        im = Image.open(os.path.join(p, f))
        print(f"{f}: size={im.size}, mode={im.mode}")

