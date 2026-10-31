from PIL import Image

im = Image.open("Flat Assets/civic/1793475803107.png")
w, h = im.size
pix = im.load()

# Let's inspect where pixels are NOT checkerboard
# Find bounding box
min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(0, h, 4):
    for x in range(0, w, 4):
        r, g, b = pix[x, y][:3]
        is_checker = (205 <= r <= 250) and abs(r-g) <= 5 and abs(g-b) <= 5
        if not is_checker:
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

print("1793475803107.png bbox:", (min_x, min_y, max_x, max_y))

# Let's inspect the top 20% of this bbox (where the head should be!)
head_crop = im.crop((min_x, min_y, max_x, min_y + (max_y - min_y)//3))
head_crop.save("test_head_1793475803107.png")
print("Saved test_head_1793475803107.png, size:", head_crop.size)

