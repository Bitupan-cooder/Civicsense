from PIL import Image

src_path = "Flat Assets/civic/1793478568782.png"
im = Image.open(src_path).convert("RGBA")
sw, sh = im.size
spix = im.load()

clean_im = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
cpix = clean_im.load()

min_x, min_y, max_x, max_y = sw, sh, 0, 0
for y in range(sh):
    for x in range(sw):
        r, g, b, a = spix[x, y]
        is_checker = (205 <= r <= 250) and (abs(r - g) <= 5) and (abs(g - b) <= 5) and (abs(r - b) <= 5)
        if not is_checker:
            cpix[x, y] = (r, g, b, 255)
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

crop = clean_im.crop((min_x, min_y, max_x + 1, max_y + 1))
target_h = 650
target_w = int(crop.width * (target_h / crop.height))
final_c1 = crop.resize((target_w, target_h), Image.Resampling.LANCZOS)

final_c1.save("public/flat-assets/civic-cutouts/char-1-recycling.png")
final_c1.save("public/flat-assets/civic-transparent/char-1-recycling.png")
print(f"Generated clean char-1-recycling.png: crop {crop.size} -> final {final_c1.size}")

