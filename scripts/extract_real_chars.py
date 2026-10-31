from PIL import Image
import os

out_dir = "public/flat-assets/civic-transparent"
os.makedirs(out_dir, exist_ok=True)

for f in sorted(os.listdir("Flat Assets/civic")):
    if not f.endswith(".png"): continue
    p = os.path.join("Flat Assets/civic", f)
    im = Image.open(p).convert("RGBA")
    w, h = im.size
    pix = im.load()
    
    # We create a new transparent image
    out_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_pix = out_im.load()
    
    min_x, min_y, max_x, max_y = w, h, 0, 0
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            # Check if this pixel is the checkerboard background
            # Checkerboard is grey tones: |r-g| <= 5, |g-b| <= 5, and r is between 205 and 248
            is_checker = (205 <= r <= 250) and (abs(r - g) <= 5) and (abs(g - b) <= 5) and (abs(r - b) <= 5)
            
            # If it's NOT checkerboard, keep it!
            # Note: what if the character has white areas (e.g. r=255, g=255, b=255)? 
            # pure white has r >= 251 or is colored
            if not is_checker:
                out_pix[x, y] = (r, g, b, 255)
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    if max_x > min_x and max_y > min_y:
        # Crop to tight bounding box
        cropped = out_im.crop((min_x, min_y, max_x + 1, max_y + 1))
        out_name = f"extracted_{f}"
        cropped.save(os.path.join(out_dir, out_name))
        print(f"Extracted {f} -> bbox ({min_x}, {min_y}, {max_x}, {max_y}), crop size {cropped.size}")

