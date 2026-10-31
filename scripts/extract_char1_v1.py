from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
ref = Image.open(ref_path)

# Character 1: Boy bagging trash/recycling
# In 1024x530:
# Bounding box of character 1:
# Let's crop from x=80 to x=280, y=240 to y=500
char1 = ref.crop((85, 235, 275, 500))
w, h = char1.size
pix = char1.load()

# Create transparent RGBA
out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
out_pix = out.load()

# Background is green around (71, 217, 106)
# Lines are light mint/white: brightness is higher, or r > 110, or (r + b) > 230
for y in range(h):
    for x in range(w):
        r, g, b = pix[x, y]
        # Is it part of the character (lines or body)?
        # The character is drawn with white lines:
        is_line = (r > 120 and g > 210 and b > 130) or (r > 170 and b > 170)
        # Also inside the bag there is a recycling logo
        # And clothing has white outlines
        # Let's see: in the reference, the characters have green body fills and white outlines!
        # If we fill character body with vibrant civic green (#17B73D) and white outlines:
        # Let's test if is_line:
        if is_line:
            out_pix[x, y] = (255, 255, 255, 255)
        # Or if it's inside the boy's body or hoodie or bag
        
out.save("scratch_char1_lines.png")
print("Saved scratch_char1_lines.png")

