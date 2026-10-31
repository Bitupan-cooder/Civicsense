from PIL import Image

im = Image.open("Flat Assets/civic/1793475803107.png")
w, h = im.size
pix = im.load()

# Let's find horizontal distribution of green/white pixels in 1793475803107.png
x_hist = [0] * (w // 40)
for y in range(0, h, 20):
    for x in range(0, w, 40):
        r, g, b = pix[x, y][:3]
        if g > r + 20 and g > b + 20 or (r >= 250 and g >= 250 and b >= 250):
            x_hist[x // 40] += 1

print("Horizontal distribution (x in steps of 40):")
print(x_hist)

