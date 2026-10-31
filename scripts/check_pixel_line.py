from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
ref = Image.open(ref_path)
pix = ref.load()

# Let's inspect line colors around character 1:
# Let's find pixels where brightness is significantly higher than neighboring green
for y in range(250, 450, 20):
    for x in range(100, 250, 10):
        c = pix[x, y]
        # check if it is light green or white or what
        print(f"({x},{y}): RGB = {c}")

