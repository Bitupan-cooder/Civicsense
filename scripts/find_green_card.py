from PIL import Image

p = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
im = Image.open(p)
w, h = im.size
pix = im.load()

# Find bounding box of the green card
min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b = pix[x, y]
        # Green is dominant: g > 130 and g > r + 30 and g > b + 30
        if g > 100 and g > r + 20 and g > b + 20:
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

print(f"Green card bbox: ({min_x}, {min_y}, {max_x}, {max_y}), size: ({max_x-min_x}, {max_y-min_y})")

