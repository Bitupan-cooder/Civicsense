from PIL import Image

# Let's inspect each of the 4 files in Flat Assets/civic and write an image description
# Let's write a script to save a clean PNG of each character with green lines on transparent background
import os

out_dir = "scratch_chars"
os.makedirs(out_dir, exist_ok=True)

for f in sorted(os.listdir("Flat Assets/civic")):
    if not f.endswith(".png"): continue
    im = Image.open(os.path.join("Flat Assets/civic", f)).convert("RGBA")
    pix = im.load()
    w, h = im.size
    
    # Let's create an image where lines are green (#1EA854) on transparent
    clean = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    clean_pix = clean.load()
    
    min_x, min_y, max_x, max_y = w, h, 0, 0
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            is_checker = (205 <= r <= 250) and (abs(r - g) <= 5) and (abs(g - b) <= 5)
            if not is_checker:
                # Is it line art (white or near white) or green?
                # Let's color the line art in rich Civic Green (#1EA854)
                clean_pix[x, y] = (30, 168, 84, 255)
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    if max_x > min_x and max_y > min_y:
        crop = clean.crop((min_x, min_y, max_x+1, max_y+1))
        crop.save(os.path.join(out_dir, f"clean_{f}"))
        print(f"Processed {f}: bbox ({min_x}, {min_y}, {max_x}, {max_y}), crop size {crop.size}")

