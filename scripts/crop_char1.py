from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
ref = Image.open(ref_path)

# Let's crop Character 1 (Boy recycling trash)
# In the original 1024x530 image:
# Character 1 is roughly x: 70 to 270, y: 220 to 500
char1 = ref.crop((60, 220, 280, 505))
char1.save("scratch_char1_raw.png")
print("Saved scratch_char1_raw.png, size:", char1.size)

