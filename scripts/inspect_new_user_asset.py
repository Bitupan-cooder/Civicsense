from PIL import Image

p = "Flat Assets/civic/1793478568782.png"
im = Image.open(p)
print(f"File: {p}, size={im.size}, mode={im.mode}")

