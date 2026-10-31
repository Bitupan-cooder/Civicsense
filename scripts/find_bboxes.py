from PIL import Image
import os

for f in sorted(os.listdir("Flat Assets/civic")):
    if not f.endswith(".png"): continue
    im = Image.open(os.path.join("Flat Assets/civic", f))
    # find bounding box of green or non-background
    # let's find pixels where green is dominant or where color is distinct from background
    w, h = im.size
    pixels = im.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    bg = pixels[0, 0]
    count = 0
    for y in range(h):
        for x in range(w):
            c = pixels[x, y]
            # distance from bg
            dist = abs(c[0]-bg[0]) + abs(c[1]-bg[1]) + abs(c[2]-bg[2])
            if dist > 30:
                count += 1
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
    print(f"{f}: non-bg count={count}, bbox=({min_x}, {min_y}, {max_x}, {max_y}), crop size=({max_x-min_x}, {max_y-min_y})")

