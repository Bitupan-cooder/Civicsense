from PIL import Image

for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{f}")
    # Save a clean 800px preview of the exact raw file
    resized = im.resize((800, int(im.height * 800 / im.width)))
    resized.save(f"raw_preview_{f}")
    print(f"Saved raw_preview_{f}, mode={im.mode}, size={im.size}")

