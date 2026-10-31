from PIL import Image

for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{f}")
    w, h = im.size
    pix = im.load()
    
    # Check bounding box of pixels that are colored or dark or bright white
    min_x, min_y, max_x, max_y = w, h, 0, 0
    match_count = 0
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r, g, b = pix[x, y][:3]
            # If not checkerboard grey:
            # checkerboard grey is between 210 and 245, with |r-g| < 6 and |g-b| < 6
            is_checker = (210 <= r <= 245) and (abs(r - g) <= 5) and (abs(g - b) <= 5)
            if not is_checker:
                match_count += 1
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    print(f"{f}: matches={match_count}, bbox=({min_x}, {min_y}, {max_x}, {max_y}), size=({max_x-min_x}, {max_y-min_y})")

