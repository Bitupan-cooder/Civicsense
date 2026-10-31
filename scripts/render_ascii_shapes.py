from PIL import Image

for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{f}")
    # Crop to the content area
    w, h = im.size
    pix = im.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(0, h, 8):
        for x in range(0, w, 8):
            r, g, b = pix[x, y][:3]
            is_checker = (205 <= r <= 248) and abs(r-g) <= 4 and abs(g-b) <= 4
            if not is_checker:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    cropped = im.crop((min_x, min_y, max_x, max_y)).resize((45, 25))
    cpix = cropped.load()
    print(f"\n=================== {f} (BBox: {min_x},{min_y} - {max_x},{max_y}) ===================")
    for y in range(25):
        row = ""
        for x in range(45):
            r, g, b = cpix[x, y][:3]
            is_checker = (205 <= r <= 248) and abs(r-g) <= 4 and abs(g-b) <= 4
            if is_checker:
                row += " "
            elif r >= 240 and g >= 240 and b >= 240:
                row += "O" # White outline
            elif g > r + 15:
                row += "#" # Green fill
            else:
                row += "."
        print(row)

