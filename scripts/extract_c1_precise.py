from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
im = Image.open(ref_path)

# Let's find the exact bounds of Character 1's head, body, and bag
# The head top is around y=180, x=150 to 220
# The bag left is around x=85
# The leg right is around x=265
# The bottom is around y=500
crop1 = im.crop((75, 175, 275, 505))
crop1.save("c1_exact_box.png")
print("Saved c1_exact_box.png, size:", crop1.size)

