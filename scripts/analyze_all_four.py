from PIL import Image

for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"Flat Assets/civic/{f}")
    pix = im.load()
    w, h = im.size
    print(f"\nAnalyzing {f}:")
    # Sample center area
    green_count = 0
    white_count = 0
    checker_count = 0
    other_count = 0
    for y in range(0, h, 20):
        for x in range(0, w, 20):
            r, g, b = pix[x, y][:3]
            if g > r + 20 and g > b + 20:
                green_count += 1
            elif r >= 250 and g >= 250 and b >= 250:
                white_count += 1
            elif 205 <= r <= 248 and abs(r-g) <= 4 and abs(g-b) <= 4:
                checker_count += 1
            else:
                other_count += 1
    print(f"  Green: {green_count}, White: {white_count}, Checkerboard: {checker_count}, Other: {other_count}")

