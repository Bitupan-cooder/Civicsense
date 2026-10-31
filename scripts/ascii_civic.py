import os
from PIL import Image

# Let's save small ASCII art or text description of where white pixels are
for f in sorted(os.listdir('Flat Assets/civic')):
    img = Image.open(f'Flat Assets/civic/{f}')
    img = img.resize((60, 30))
    pixels = img.load()
    print(f"\n=== {f} ===")
    for y in range(30):
        line = ""
        for x in range(60):
            r, g, b = pixels[x, y][:3]
            if g > 100 and g > r + 30 and g > b + 30:
                line += "." # green
            elif r > 180 and g > 180 and b > 180:
                line += "#" # white
            else:
                line += " " # dark or border
        print(line)

