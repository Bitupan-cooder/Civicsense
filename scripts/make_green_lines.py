from PIL import Image
import os

# Create green-line variants (#1EA854) of all 5 cutouts for frameless cream background
dir_path = 'public/flat-assets/civic-cutouts'
for f in os.listdir(dir_path):
    if not f.endswith('.png') or f.startswith('green-'):
        continue
    img = Image.open(os.path.join(dir_path, f)).convert('RGBA')
    pixels = img.load()
    w, h = img.size
    new_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    new_pixels = new_img.load()
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a > 40:
                # Tint white lines to civic green (#1EA854)
                new_pixels[x, y] = (30, 168, 84, a)
    
    out_name = f"green-{f}"
    new_img.save(os.path.join(dir_path, out_name), 'PNG')
    print(f"Generated {out_name}: {new_img.size}")

