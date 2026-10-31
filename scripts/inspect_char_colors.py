from PIL import Image

im = Image.open("Flat Assets/civic/1793475803107.png")
pix = im.load()
w, h = im.size

# Let's find some pixels that are definitely part of the character
# and see their RGB values
char_pixels = []
for y in range(h//4, 3*h//4, 10):
    for x in range(w//4, 3*w//4, 10):
        r, g, b = pix[x, y]
        # Not grey
        if max(r, g, b) - min(r, g, b) > 15:
            char_pixels.append((r, g, b))

print("Total non-grey samples in center region:", len(char_pixels))
import collections
counter = collections.Counter(char_pixels)
print("Top 10 character colors in 1793475803107.png:")
for color, count in counter.most_common(10):
    print(f"  RGB: {color}, Count: {count}")

