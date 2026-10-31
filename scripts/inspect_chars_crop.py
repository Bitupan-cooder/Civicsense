from PIL import Image

p = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
im = Image.open(p)
# Crop the characters area: y from ~150 to 500
chars_crop = im.crop((6, 150, 960, 510))
chars_crop.save("scratch_chars_crop.png")
print("Saved scratch_chars_crop.png, size:", chars_crop.size)

# Let's inspect pixel colors in this region:
pix = chars_crop.load()
w, h = chars_crop.size
color_hist = {}
for y in range(0, h, 2):
    for x in range(0, w, 2):
        r, g, b = pix[x, y]
        # classify
        if r > 200 and g > 200 and b > 200:
            color_hist["white_lines"] = color_hist.get("white_lines", 0) + 1
        elif g > r + 30 and g > b + 30:
            color_hist[f"green_shade_{g//20*20}"] = color_hist.get(f"green_shade_{g//20*20}", 0) + 1
        else:
            color_hist["other"] = color_hist.get("other", 0) + 1

for k, v in sorted(color_hist.items(), key=lambda x: x[1], reverse=True):
    print(f"  {k}: {v}")

