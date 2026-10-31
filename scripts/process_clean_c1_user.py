from PIL import Image

src_path = "Flat Assets/civic/1793478568782.png"
im = Image.open(src_path).convert("RGBA")
sw, sh = im.size
spix = im.load()

clean_im = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
cpix = clean_im.load()

for y in range(sh):
    for x in range(sw):
        r, g, b, a = spix[x, y]
        # Checkerboard is neutral grey
        is_checker = (abs(r - g) <= 6) and (abs(g - b) <= 6) and (r > 180)
        # Also pure black/grey corners or watermark
        if not is_checker and not (x > sw - 200 and y > sh - 200 and abs(r-g) <= 10):
            cpix[x, y] = (r, g, b, 255)

# Keep only the main connected component
visited = set()
components = []
for y in range(sh):
    for x in range(sw):
        if cpix[x, y][3] > 0 and (x, y) not in visited:
            comp = []
            queue = [(x, y)]
            visited.add((x, y))
            while queue:
                cx, cy = queue.pop(0)
                comp.append((cx, cy))
                for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                    if 0 <= nx < sw and 0 <= ny < sh and (nx, ny) not in visited and cpix[nx, ny][3] > 0:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            components.append(comp)

components.sort(key=len, reverse=True)
main_body = set(components[0])

# Rebuild clean image with only the boy
final_body = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
fb_pix = final_body.load()
min_x, min_y, max_x, max_y = sw, sh, 0, 0
for (x, y) in main_body:
    fb_pix[x, y] = cpix[x, y]
    if x < min_x: min_x = x
    if x > max_x: max_x = x
    if y < min_y: min_y = y
    if y > max_y: max_y = y

crop = final_body.crop((min_x, min_y, max_x + 1, max_y + 1))
target_h = 650
target_w = int(crop.width * (target_h / crop.height))
final_c1 = crop.resize((target_w, target_h), Image.Resampling.LANCZOS)

final_c1.save("public/flat-assets/civic-cutouts/char-1-recycling.png")
final_c1.save("public/flat-assets/civic-transparent/char-1-recycling.png")
print(f"Pristine char-1-recycling.png generated: crop {crop.size} -> final {final_c1.size}")

