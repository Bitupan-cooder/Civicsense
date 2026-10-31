from PIL import Image
import os

os.makedirs("scratch_preview", exist_ok=True)

for f in sorted(os.listdir("Flat Assets/civic")):
    if f.endswith(".png"):
        im = Image.open(os.path.join("Flat Assets/civic", f))
        # let's save a resized 400x300 version to scratch_preview
        thumb = im.resize((400, int(im.height * 400 / im.width)))
        thumb.save(os.path.join("scratch_preview", f"thumb_{f}"))
        print(f"Saved thumb for {f}, original size {im.size}")

