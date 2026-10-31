from PIL import Image

# Let's check what resolution and visual details each file in Flat Assets/civic has
for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{f}")
    print(f, im.size)

