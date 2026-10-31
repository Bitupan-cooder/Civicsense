from PIL import Image

im = Image.open("Flat Assets/civic/1793478568782.png")
pix = im.load()
w, h = im.size

min_x, min_y, max_x, max_y = w, h, 0, 0
match_count = 0
for y in range(0, h, 2):
    for x in range(0, w, 2):
        r, g, b = pix[x, y][:3]
        # Checkerboard is neutral grey tones where |r-g| <= 5, |g-b| <= 5 and 205 <= r <= 250
        is_checker = (205 <= r <= 250) and (abs(r - g) <= 5) and (abs(g - b) <= 5)
        if not is_checker:
            match_count += 1
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

print(f"Non-checkerboard count={match_count}, bbox=({min_x}, {min_y}, {max_x}, {max_y}), crop size=({max_x-min_x}, {max_y-min_y})")

