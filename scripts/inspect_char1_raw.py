from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
im = Image.open(ref_path)
w, h = im.size
print("Original size:", w, h)

# Let's crop Character 1 with generous bounds:
# In the original 1024x530:
# Boy's head starts around y=180, x=80
# Crop x from 50 to 280, y from 170 to 510
c1_raw = im.crop((50, 170, 290, 510))
c1_raw.save("char1_full_raw.png")
print("Saved char1_full_raw.png, size:", c1_raw.size)

