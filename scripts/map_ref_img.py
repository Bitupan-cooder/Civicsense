from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
ref = Image.open(ref_path).resize((100, 50))
pix = ref.load()

for y in range(50):
    row = ""
    for x in range(100):
        r, g, b = pix[x, y][:3]
        # White line detection
        if r > 180 and g > 200 and b > 180:
            row += "#"
        elif g > r + 30 and g > b + 30:
            row += "."
        else:
            row += " "
    print(row)

