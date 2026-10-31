from PIL import Image

im = Image.open("c1_segmented.png")
w, h = im.size
pix = im.load()

# Connected components
visited = set()
components = []
for y in range(h):
    for x in range(w):
        if pix[x, y][3] > 0 and (x, y) not in visited:
            comp = []
            queue = [(x, y)]
            visited.add((x, y))
            while queue:
                cx, cy = queue.pop(0)
                comp.append((cx, cy))
                for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1), (cx+1, cy+1), (cx-1, cy-1), (cx+1, cy-1), (cx-1, cy+1)]:
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited and pix[nx, ny][3] > 0:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            components.append(comp)

# Keep components that belong to the boy:
# Exclude components in the top-left tree area (x < 75 and y < 105)
# Also exclude small components on the right border (x > 185 and y < 80)
boy_pixels = set()
for comp in components:
    min_x = min(x for x, y in comp)
    max_x = max(x for x, y in comp)
    min_y = min(y for x, y in comp)
    max_y = max(y for x, y in comp)
    # Check if tree on left:
    if max_x < 80 and max_y < 110:
        continue
    # Check if tree on right:
    if min_x > 180 and max_y < 60:
        continue
    # Check if very small noise (< 15 pixels):
    if len(comp) < 15:
        continue
    for p in comp:
        boy_pixels.add(p)

clean_boy = Image.new("RGBA", (w, h), (0, 0, 0, 0))
cpix = clean_boy.load()
min_x, min_y, max_x, max_y = w, h, 0, 0
for (x, y) in boy_pixels:
    cpix[x, y] = pix[x, y]
    if x < min_x: min_x = x
    if x > max_x: max_x = x
    if y < min_y: min_y = y
    if y > max_y: max_y = y

crop = clean_boy.crop((min_x, min_y, max_x + 1, max_y + 1))
# Target height 650 (same as other characters)
target_h = 650
target_w = int(crop.width * (target_h / crop.height))
final_c1 = crop.resize((target_w, target_h), Image.Resampling.LANCZOS)

final_c1.save("public/flat-assets/civic-cutouts/char-1-recycling.png")
final_c1.save("public/flat-assets/civic-transparent/char-1-recycling.png")
print(f"Successfully generated char-1-recycling.png: crop {crop.size} -> final {final_c1.size}")

