from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
im = Image.open(ref_path)

# Let's crop from x=75, y=170 to x=280, y=510
c1 = im.crop((75, 170, 280, 510))
c1.save("c1_with_head.png")
print("Saved c1_with_head.png, size:", c1.size)

