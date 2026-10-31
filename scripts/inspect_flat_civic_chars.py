from PIL import Image
import os

# Let's inspect the exact pixel properties of these 4 files
for f in sorted(os.listdir("Flat Assets/civic")):
    if not f.endswith(".png"): continue
    im = Image.open(os.path.join("Flat Assets/civic", f))
    w, h = im.size
    pix = im.load()
    
    # Check what kind of background it has.
    # Is it a grey checkerboard?
    # Let's sample across the image to find the background colors
    bg_samples = []
    for y in [10, 20, 50, 100]:
        for x in [10, 20, 50, 100]:
            bg_samples.append(pix[x, y][:3])
    print(f"{f}: size={w}x{h}, mode={im.mode}")
    print("  Sample bg colors:", set(bg_samples))

