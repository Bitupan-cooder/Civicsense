from PIL import Image

p = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
im = Image.open(p)
w, h = im.size
print(f"Original illustration: size = {w}x{h}, mode = {im.mode}")

# Let's inspect the colors
pix = im.load()
# Sample top-left corner (green background)
print("Top-left green background color:", pix[20, 20])
# Sample bottom center
print("Bottom center color:", pix[w//2, h-20])
# Center text color
print("Center (text/character) sample:", pix[w//2, h//2])

