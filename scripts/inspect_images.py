from PIL import Image
import os

print("--- Flat Assets/civic ---")
for f in os.listdir("Flat Assets/civic"):
    if f.endswith((".png", ".jpg")):
        p = os.path.join("Flat Assets/civic", f)
        im = Image.open(p)
        print(f, im.size, im.mode)

print("\n--- public/flat-assets/civic-cutouts ---")
for f in os.listdir("public/flat-assets/civic-cutouts"):
    if f.endswith((".png", ".jpg")):
        p = os.path.join("public/flat-assets/civic-cutouts", f)
        im = Image.open(p)
        print(f, im.size, im.mode)

