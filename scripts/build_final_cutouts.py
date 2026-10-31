from PIL import Image, ImageFilter
import os

out_dir = "public/flat-assets/civic-transparent"
os.makedirs(out_dir, exist_ok=True)

# 1. Clean Character 1 (flood fill result, remove noise specks, crop)
c1 = Image.open("scratch_c1_flood.png")
w, h = c1.size
pix = c1.load()

# Connected component labeling to remove noise outside the main body
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
                for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited and pix[nx, ny][3] > 0:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            components.append(comp)

# Find the largest component (the boy's body)
components.sort(key=len, reverse=True)
main_body = set(components[0])

# Keep only the main body
c1_clean = Image.new("RGBA", (w, h), (0, 0, 0, 0))
c1_pix = c1_clean.load()
min_x, min_y, max_x, max_y = w, h, 0, 0
for (x, y) in main_body:
    c1_pix[x, y] = pix[x, y]
    if x < min_x: min_x = x
    if x > max_x: max_x = x
    if y < min_y: min_y = y
    if y > max_y: max_y = y

c1_cropped = c1_clean.crop((min_x, min_y, max_x + 1, max_y + 1))
# Upscale 2x with Lanczos for high quality
c1_upscaled = c1_cropped.resize((c1_cropped.width * 2, c1_cropped.height * 2), Image.Resampling.LANCZOS)
c1_upscaled.save(os.path.join(out_dir, "char-1-recycling.png"))
print("Saved char-1-recycling.png:", c1_upscaled.size)

# Characters 2, 3, 4, 5 from Flat Assets/civic:
sources = [
    ("1793475803107.png", "char-2-planting.png"),
    ("1793475836520.png", "char-3-megaphone.png"),
    ("1793475871836.png", "char-4-auditor.png"),
    ("1793475909720.png", "char-5-dispatch.png"),
]

for src_name, out_name in sources:
    src_path = os.path.join("Flat Assets/civic", src_name)
    im = Image.open(src_path).convert("RGBA")
    sw, sh = im.size
    spix = im.load()
    
    clean_im = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    cpix = clean_im.load()
    
    min_x, min_y, max_x, max_y = sw, sh, 0, 0
    for y in range(sh):
        for x in range(sw):
            r, g, b, a = spix[x, y]
            is_checker = (205 <= r <= 250) and (abs(r - g) <= 5) and (abs(g - b) <= 5)
            if not is_checker:
                cpix[x, y] = (r, g, b, 255)
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    if max_x > min_x and max_y > min_y:
        crop = clean_im.crop((min_x, min_y, max_x + 1, max_y + 1))
        # Resize to standard height around 600-700px for crisp, fast display
        target_h = 650
        target_w = int(crop.width * (target_h / crop.height))
        resized = crop.resize((target_w, target_h), Image.Resampling.LANCZOS)
        resized.save(os.path.join(out_dir, out_name))
        print(f"Saved {out_name}: original {crop.size} -> {resized.size}")

